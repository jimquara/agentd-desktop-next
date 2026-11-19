// @effect-diagnostics nodeBuiltinImport:off -- Builds real git repositories, as the reference test does.
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import type { AgentdError, AgentdHandoffShowJson } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import * as ProcessRunner from "../processRunner.ts";
import {
  REVIEW_REASONS,
  cloudPullRequest,
  fetchFailureReason,
  makeCloudReview,
} from "./agentdCloudReview.ts";

const finished = (fields: Partial<AgentdHandoffShowJson>): AgentdHandoffShowJson => ({
  id: "hof-aabbcc",
  state: "done",
  cloud_state: "completed",
  project: "acme/app",
  worker_branch: "agentd/hof-aabbcc",
  ...fields,
});

function runGit(cwd: string, ...args: string[]): string {
  return NodeChildProcess.execFileSync(
    "git",
    [
      "-C",
      cwd,
      "-c",
      "user.email=review@example.com",
      "-c",
      "user.name=Review",
      "-c",
      "commit.gpgsign=false",
      ...args,
    ],
    { encoding: "utf8" },
  ).trim();
}

// A hosted repository with a cloud task's branch, and a clone of it with an uncommitted change.
function cloudRepository() {
  const work = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "agentd-cloud-review-"));
  const hosted = NodePath.join(work, "cloud-origin");
  const checkout = NodePath.join(work, "cloud-review");
  NodeFS.mkdirSync(hosted);
  runGit(hosted, "init", "-q");
  runGit(hosted, "symbolic-ref", "HEAD", "refs/heads/main");
  NodeFS.writeFileSync(NodePath.join(hosted, "feature.txt"), "original\n");
  runGit(hosted, "add", "feature.txt");
  runGit(hosted, "commit", "-qm", "Base");
  runGit(work, "clone", "-q", hosted, checkout);
  runGit(hosted, "checkout", "-qb", "agentd/hof-aabbcc");
  NodeFS.writeFileSync(NodePath.join(hosted, "feature.txt"), "cloud change\n");
  runGit(hosted, "commit", "-qam", "Completed cloud task");
  runGit(hosted, "checkout", "-q", "main");
  NodeFS.writeFileSync(NodePath.join(checkout, "feature.txt"), "uncommitted local change\n");
  return {
    work,
    checkout,
    [Symbol.dispose]: () => NodeFS.rmSync(work, { recursive: true, force: true }),
  };
}

// Git as old as the reference supports: options added in newer releases are refused.
const LEGACY_REFUSED = ["--atomic", "--no-write-fetch-head", "--refmap", "--porcelain"];

const review = (show: AgentdHandoffShowJson, origin: string | null = "acme/app") =>
  Effect.gen(function* () {
    const runner = yield* ProcessRunner.make();
    const runProcess: ProcessRunner.ProcessRunner["Service"]["run"] = (input) =>
      input.args.some((arg) => LEGACY_REFUSED.includes(arg))
        ? Effect.succeed({
            stdout: "",
            stderr: "error: unknown option",
            code: 129 as never,
            timedOut: false,
            stdoutTruncated: false,
            stderrTruncated: false,
            stdoutInvalidUtf8: false,
            stderrInvalidUtf8: false,
          })
        : runner.run(input);
    return makeCloudReview({
      runProcess,
      readShow: () => Effect.succeed(show),
      originProject: () => Effect.succeed(origin),
    });
  }).pipe(Effect.provide(NodeServices.layer));

const failure = <A>(effect: Effect.Effect<A, AgentdError>) =>
  effect.pipe(
    Effect.flip,
    Effect.map((error) => error.message),
  );

describe("cloud branch review", () => {
  it.live("works with legacy Git and compares a branch without changing the checkout", () =>
    Effect.gen(function* () {
      using repo = cloudRepository();
      const read = yield* review(finished({}));
      const result = yield* read({ id: "hof-aabbcc", cwd: repo.checkout });
      expect(result.branch).toBe("agentd/hof-aabbcc");
      expect(result.truncated).toBe(false);
      expect(result.patch).toMatch(/^-original$/m);
      expect(result.patch).toMatch(/^\+cloud change$/m);
      expect(result.patch).not.toMatch(/uncommitted local change/);
      expect(runGit(repo.checkout, "symbolic-ref", "--short", "HEAD")).toBe("main");
      expect(runGit(repo.checkout, "diff")).toMatch(/^\+uncommitted local change$/m);
      expect(runGit(repo.checkout, "diff", "--cached")).toBe("");
      expect(runGit(repo.checkout, "for-each-ref", "refs/agentd")).toBe("");
    }),
  );

  it.live("says the branch is gone when GitHub no longer has it", () =>
    Effect.gen(function* () {
      using repo = cloudRepository();
      const read = yield* review(finished({ worker_branch: "agentd/hof-deleted" }));
      expect(yield* failure(read({ id: "hof-aabbcc", cwd: repo.checkout }))).toBe(
        REVIEW_REASONS.branchGone,
      );
      expect(runGit(repo.checkout, "for-each-ref", "refs/agentd")).toBe("");
    }),
  );

  it.live("refuses a checkout whose origin is another repository, or has none", () =>
    Effect.gen(function* () {
      using repo = cloudRepository();
      const other = yield* review(finished({}), "acme/other");
      expect(yield* failure(other({ id: "hof-aabbcc", cwd: repo.checkout }))).toBe(
        REVIEW_REASONS.origin,
      );
      const folder = yield* review(finished({}), null);
      expect(yield* failure(folder({ id: "hof-aabbcc", cwd: repo.work }))).toBe(
        REVIEW_REASONS.origin,
      );
    }),
  );

  it.live("offers nothing for a task that has not finished or pushed no branch", () =>
    Effect.gen(function* () {
      using repo = cloudRepository();
      for (const show of [
        finished({ cloud_state: "running" }),
        finished({ worker_branch: null }),
        finished({ worker_branch: "bad..name" }),
      ]) {
        const read = yield* review(show);
        expect(yield* failure(read({ id: "hof-aabbcc", cwd: repo.checkout }))).toBe(
          REVIEW_REASONS.unavailable,
        );
      }
    }),
  );

  it("tells a fetch without access from one that failed", () => {
    expect(
      fetchFailureReason(
        "remote: Repository not found.\nfatal: repository 'https://github.com/acme/app.git/' not found",
      ),
    ).toBe(REVIEW_REASONS.access);
    expect(
      fetchFailureReason(
        "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
      ),
    ).toBe(REVIEW_REASONS.access);
    expect(fetchFailureReason("git@github.com: Permission denied (publickey).")).toBe(
      REVIEW_REASONS.access,
    );
    expect(fetchFailureReason("fatal: couldn't find remote ref refs/heads/agentd/x")).toBe(
      REVIEW_REASONS.branchGone,
    );
    expect(
      fetchFailureReason(
        "fatal: unable to access 'https://github.com/acme/app.git/': Could not resolve host: github.com",
      ),
    ).toBe(REVIEW_REASONS.fetch);
  });
});

describe("cloud pull request link", () => {
  it("preserves branch path separators and escapes special characters", () => {
    expect(
      cloudPullRequest(
        finished({
          worker_branch: "agentd/result#1",
          body: { goal: 'Fix R&D + 100% #1?\nKeep "details" intact.' },
        }),
      ),
    ).toEqual({
      url: "https://github.com/acme/app/compare/agentd/result%231?quick_pull=1&title=Fix+R%26D+%2B+100%25+%231%3F&body=Fix+R%26D+%2B+100%25+%231%3F%0AKeep+%22details%22+intact.",
      number: null,
    });
  });

  it("does not let a large pasted log prevent opening the pull request form", () => {
    expect(
      cloudPullRequest(
        finished({
          worker_branch: "agentd/result",
          body: { goal: `Fix the deployment\n${"⚠️".repeat(800)}` },
        }),
      ),
    ).toEqual({
      url: "https://github.com/acme/app/compare/agentd/result?quick_pull=1&title=Fix+the+deployment",
      number: null,
    });
  });

  it("opens the task's own pull request when agentd links one, and nothing before it finishes", () => {
    expect(cloudPullRequest(finished({ prs: ["other/repo#3", "Acme/App#42"] }))).toEqual({
      url: "https://github.com/Acme/App/pull/42",
      number: 42,
    });
    expect(cloudPullRequest(finished({ cloud_state: "running" }))).toBeNull();
    expect(cloudPullRequest(finished({ worker_branch: null }))).toBeNull();
  });
});
