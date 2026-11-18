import type { AgentdNode, AgentdTaskRow } from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";

import { groupWorkerActivity } from "./AgentdPage.logic";

const task = (id: string, values: Partial<AgentdTaskRow> = {}): AgentdTaskRow => ({
  id,
  title: id,
  state: "claimed",
  runsOn: "local",
  workerRunning: false,
  workerState: null,
  workerTool: null,
  project: null,
  issue: null,
  started: null,
  branch: null,
  updated: null,
  ...values,
});

const node = (name: string, state: string): AgentdNode => ({
  name,
  host: name,
  person: null,
  state,
  why: null,
  seen: "2026-11-18T10:25:00Z",
  offline: false,
});

it("groups live work by location without losing idle nodes or confusing queued local tasks with workers", () => {
  const activity = groupWorkerActivity(
    [
      task("local-running", { workerRunning: true }),
      task("local-queued", { state: "offered" }),
      task("team-running", { workerName: "build-box", runsOn: "team" }),
      task("team-testing", { workerName: "build-box", runsOn: "team" }),
      task("team-done", { workerName: "build-box", runsOn: "team", state: "done" }),
      task("team-unlisted", { workerName: "remote-laptop", runsOn: "team" }),
      task("cloud-running", { runsOn: "cloud", workerState: "running" }),
      task("cloud-cancelled", { runsOn: "cloud", state: "cancelled" }),
    ],
    [node("build-box", "busy"), node("spare", "idle")],
  );

  expect(activity.local.map(({ id }) => id)).toEqual(["local-running"]);
  expect(activity.team.map(({ name, tasks }) => [name, tasks.map(({ id }) => id)])).toEqual([
    ["build-box", ["team-running", "team-testing"]],
    ["spare", []],
    ["remote-laptop", ["team-unlisted"]],
  ]);
  expect(activity.cloud.map(({ id }) => id)).toEqual(["cloud-running"]);
});
