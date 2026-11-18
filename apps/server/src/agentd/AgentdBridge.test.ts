import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { ChildProcessSpawner } from "effect/process";

import * as BackgroundPolicy from "../background/BackgroundPolicy.ts";
import * as ProcessRunner from "../processRunner.ts";
import * as AgentdBridge from "./AgentdBridge.ts";

// Recorded from agentd v0.1.13 (`handoff list --json`, `handoff show ID --json`, `doctor --json`),
// trimmed; unknown keys stay to show they are ignored.
const LIST_JSON = `[
 {
  "a2a_state": "working",
  "check": "vp run check:changed",
  "claimer": "codex-615065aa16",
  "claimer_user": "ccao",
  "from": "claude-67a65e011e",
  "goal": "Implement libraos/agentd-desktop-next#16: Offer Claude Code, Codex and opencode",
  "id": "hof-b449178313",
  "issue": "libraos/agentd-desktop-next#16",
  "origin": { "dir": "/mnt/data/ccao/libraos/agentd-desktop", "tool": "claude" },
  "project": "libraos/agentd-desktop-next",
  "report": { "next_due": "2026-11-18T09:08:31+00:00" },
  "state": "claimed",
  "to_user": null,
  "updated": "2026-11-18T08:54:30+00:00",
  "version": 2,
  "worker_running": true,
  "worker_state": null
 },
 {
  "a2a_state": "completed",
  "claimer": "claude-8c11cb50d2",
  "goal": "Implement libraos/agentd-core#897 (read it first: gh issue view 897 -R libraos/agentd-core): in the factory report, spli",
  "id": "hof-a6e5f4e329",
  "issue": "libraos/agentd-core#897",
  "project": "libraos/agentd-core",
  "state": "done",
  "title": "Factory report: split redone into review rework, abandoned and a narrowed false accept",
  "updated": "2026-11-18T06:47:57+00:00",
  "version": 3,
  "worker_state": null
 }
]`;

const SHOW_JSON = `{
 "a2a_state": "completed",
 "accept": ["A done with a passed check", "B created on the same PR after it merged: A is redone"],
 "body": { "goal": "Implement libraos/agentd-core#897", "keep": "reverted stays a false accept" },
 "budget": "120m,$12",
 "budget_state": null,
 "check_cmd": "go test ./internal/agentd/ -run 'Outcome' -count=1",
 "cloud_state": null,
 "cost": {
  "inference": { "usd": 2.87 },
  "total": { "estimate": true, "inference_usd": 2.87, "lines": 1, "partial": false, "usd": 2.87 }
 },
 "created": "2026-11-18T06:24:58+00:00",
 "id": "hof-a6e5f4e329",
 "lease_branch": null,
 "lease_device": null,
 "project": "libraos/agentd-core",
 "state": "done",
 "title": null,
 "updated": "2026-11-18T06:47:57+00:00",
 "verdict": {
  "check": "passed: go test ./internal/agentd/",
  "delivery": "unmerged: 18 commit(s) on agentd/hof-a6e5f4e329 not in main",
  "next": "verified: merge it as it is.",
  "verdict": "verified"
 },
 "worker_branch": "agentd/hof-a6e5f4e329",
 "worker_log": "/data/agentd/.state/dispatch/hof-a6e5f4e329-20261118T062504.log",
 "worker_note": null,
 "worker_state": "",
 "worker_tool": "claude"
}`;

const DOCTOR_JSON = `{
 "checks": [
  { "id": "binary", "status": "pass", "detail": "agentd v0.1.13 0d0b360a58c0" },
  { "id": "opencode", "status": "optional", "detail": "not found; agentd works without it", "fix": "install opencode" },
  { "id": "model-prices", "status": "warn", "detail": "unpriced models" }
 ],
 "ok": true,
 "set_up": true
}`;

const output = (stdout: string, code = 0): ProcessRunner.ProcessRunOutput => ({
  stdout,
  stderr: "",
  code: ChildProcessSpawner.ExitCode(code),
  timedOut: false,
  stdoutTruncated: false,
  stderrTruncated: false,
  stdoutInvalidUtf8: false,
  stderrInvalidUtf8: false,
});

const backgroundPolicy = BackgroundPolicy.BackgroundPolicy.of({
  reportClientActivity: () => Effect.void,
  removeRpcClient: () => Effect.void,
  snapshot: Effect.die("unused"),
  shouldRunScopeWork: () => Effect.succeed(true),
  shouldRunOpportunisticWork: Effect.succeed(true),
});

const makeBridge = (env: NodeJS.ProcessEnv, run: ProcessRunner.ProcessRunner["Service"]["run"]) =>
  AgentdBridge.make().pipe(
    Effect.provideService(ProcessRunner.ProcessRunner, { run }),
    Effect.provideService(BackgroundPolicy.BackgroundPolicy, backgroundPolicy),
    Effect.provideService(HostProcess.Environment, env),
    Effect.provide(NodeServices.layer),
  );

describe("AgentdBridge", () => {
  it.effect("serves agentd's status, task list and task through the contract schemas", () =>
    Effect.gen(function* () {
      const calls: Array<ReadonlyArray<string>> = [];
      const bridge = yield* makeBridge({ AGENTD_BIN: process.execPath }, (input) => {
        calls.push(input.args);
        const key = input.args.join(" ");
        if (key === "version") return Effect.succeed(output("agentd v0.1.13 0d0b360a58c0\n"));
        // doctor exits 1 when a check fails and still prints its report.
        if (key === "doctor --json") return Effect.succeed(output(DOCTOR_JSON, 1));
        if (key === "handoff list --json") return Effect.succeed(output(LIST_JSON));
        if (key === "handoff show hof-a6e5f4e329 --json") return Effect.succeed(output(SHOW_JSON));
        return Effect.die(`unexpected agentd ${key}`);
      });

      expect(yield* bridge.status).toEqual({
        version: "agentd v0.1.13 0d0b360a58c0",
        ok: true,
        setUp: true,
        checks: [
          { id: "binary", status: "pass", detail: "agentd v0.1.13 0d0b360a58c0", fix: null },
          {
            id: "opencode",
            status: "optional",
            detail: "not found; agentd works without it",
            fix: "install opencode",
          },
          { id: "model-prices", status: "warn", detail: "unpriced models", fix: null },
        ],
      });

      const first = yield* Stream.runHead(bridge.subscribeTasks);
      expect(first._tag === "Some" ? first.value : null).toEqual([
        {
          id: "hof-b449178313",
          title: "Implement libraos/agentd-desktop-next#16: Offer Claude Code, Codex and opencode",
          state: "claimed",
          workerState: null,
          workerRunning: true,
          workerTool: "codex",
          runsOn: "local",
          project: "libraos/agentd-desktop-next",
          issue: "libraos/agentd-desktop-next#16",
          started: null,
          branch: null,
          updated: "2026-11-18T08:54:30+00:00",
        },
        {
          id: "hof-a6e5f4e329",
          title:
            "Factory report: split redone into review rework, abandoned and a narrowed false accept",
          state: "done",
          workerState: null,
          workerRunning: false,
          workerTool: "claude",
          runsOn: "local",
          project: "libraos/agentd-core",
          issue: "libraos/agentd-core#897",
          started: null,
          branch: null,
          updated: "2026-11-18T06:47:57+00:00",
        },
      ]);

      expect(yield* bridge.task({ id: "hof-a6e5f4e329" })).toEqual({
        id: "hof-a6e5f4e329",
        title: "Implement libraos/agentd-core#897",
        goal: "Implement libraos/agentd-core#897",
        state: "done",
        workerState: null,
        workerTool: "claude",
        runsOn: "local",
        accept: [
          "A done with a passed check",
          "B created on the same PR after it merged: A is redone",
        ],
        check: "go test ./internal/agentd/ -run 'Outcome' -count=1",
        verdict: {
          verdict: "verified",
          check: "passed: go test ./internal/agentd/",
          delivery: "unmerged: 18 commit(s) on agentd/hof-a6e5f4e329 not in main",
          next: "verified: merge it as it is.",
        },
        costUsd: 2.87,
        costEstimate: true,
        budget: "120m,$12",
        budgetState: null,
        branch: "agentd/hof-a6e5f4e329",
        note: null,
        project: "libraos/agentd-core",
        hasLog: true,
        started: "2026-11-18T06:24:58+00:00",
        updated: "2026-11-18T06:47:57+00:00",
      });
    }),
  );

  it.effect("answers every method with AgentdNotFoundError when there is no agentd", () =>
    Effect.gen(function* () {
      const bridge = yield* makeBridge({ PATH: "" }, () => Effect.die("agentd must not run"));
      const id = "hof-a6e5f4e329";
      const failures = yield* Effect.forEach(
        [
          bridge.status,
          Stream.runHead(bridge.subscribeTasks),
          bridge.task({ id }),
          Stream.runHead(bridge.subscribeTaskOutput({ id })),
          bridge.stopTask({ id, reason: "not needed" }),
          bridge.startTask({
            goal: "Fix it",
            accept: [],
            check: null,
            worker: "codex",
            budget: "30m",
            cwd: "/repo",
            issue: null,
          }),
          bridge.approvals,
          bridge.inbox,
          bridge.people({}),
          bridge.connectAgent({ agent: "opencode", dryRun: true }),
          bridge.joinTeam({ server: "https://agentd.example", ticket: "adt_0123456789abcdefXYZ" }),
        ],
        (effect) => Effect.flip(effect),
      );
      expect(failures.map((error) => error._tag)).toEqual(
        Array.from({ length: 11 }, () => "AgentdNotFoundError"),
      );
    }),
  );

  it.effect("sends the joinTeam ticket on stdin, never in the arguments", () =>
    Effect.gen(function* () {
      const runs: Array<ProcessRunner.ProcessRunInput> = [];
      const bridge = yield* makeBridge({ AGENTD_BIN: process.execPath }, (input) => {
        runs.push(input);
        return Effect.succeed(output("joined\n"));
      });
      const ticket = "adt_0123456789abcdefXYZ";
      yield* bridge.joinTeam({ server: "https://agentd.example/team/", ticket: ` ${ticket} ` });
      expect(runs.map((run) => [run.args, run.stdin])).toEqual([
        [
          ["connect", "--server", "https://agentd.example/team", "--ticket-file", "-"],
          `${ticket}\n`,
        ],
      ]);
    }),
  );
});
