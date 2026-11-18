import { describe, expect, it } from "vite-plus/test";

import {
  finishedAgentdTaskLabel,
  isFinishedAgentdTask,
  runningAgentdTaskLabel,
} from "./backgroundTasks.logic";

describe("background task states", () => {
  it.each([
    ["offered", false],
    ["claimed", false],
    ["blocked", false],
    ["held", false],
    ["done", true],
    ["delivered", true],
    ["cancelled", true],
    ["declined", true],
  ])("classifies %s as finished: %s", (state, finished) => {
    expect(isFinishedAgentdTask(state)).toBe(finished);
  });

  it.each([
    ["done", "verified", "passed: pnpm test", "Verified"],
    ["done", "act", "passed: pnpm test", "Needs work"],
    ["done", "wait", "passed: pnpm test", "Needs work"],
    ["done", "act", "failed: pnpm test", "Failed"],
    ["done", "act", "timed_out: pnpm test", "Failed"],
    ["cancelled", "act", null, "Stopped"],
    ["declined", "act", null, "Failed"],
    ["done", null, null, "Result unavailable"],
  ])("describes %s with verdict %s and check %s as %s", (state, verdict, check, label) => {
    expect(finishedAgentdTaskLabel(state, verdict === null ? null : { verdict, check })).toBe(
      label,
    );
  });

  it.each([
    ["claimed", null, true, null, "Running"],
    ["claimed", "blocked", false, null, "Waiting for a person"],
    ["claimed", "waiting_answer", false, null, "Waiting for a person"],
    ["claimed", null, false, "budget_exceeded", "Waiting for a person"],
    ["claimed", "gone", false, null, "Worker exited"],
    ["claimed", "stopped", false, null, "Worker stopped"],
    ["offered", null, false, null, "Queued"],
    ["blocked", null, false, null, "Waiting for other tasks"],
    ["claimed", null, false, null, "Assigned"],
  ])(
    "describes %s / %s / %s / %s as %s",
    (state, workerState, workerRunning, budgetState, label) => {
      expect(runningAgentdTaskLabel({ state, workerState, workerRunning }, budgetState)).toBe(
        label,
      );
    },
  );
});
