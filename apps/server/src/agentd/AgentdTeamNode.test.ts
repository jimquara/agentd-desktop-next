import { describe, expect, it } from "@effect/vitest";
import * as Duration from "effect/Duration";

import { restartDelay, taskAfterLine } from "./AgentdTeamNode.ts";

describe("taskAfterLine", () => {
  it.each([
    [null, "leased hof-abc123, attempt 1", "hof-abc123"],
    [
      null,
      "2026/11/18 10:00:00 leased hof-abc123, attempt 2, from branch agentd/hof-abc123",
      "hof-abc123",
    ],
    ["hof-abc123", "hof-abc123: running the command in /tmp/w on agentd/hof-abc123", "hof-abc123"],
    ["hof-abc123", "hof-abc123: delivered", null],
    ["hof-abc123", "hof-abc123: not delivered: push refused", null],
    ["hof-abc123", "hof-abc123: failed: check failed", null],
    ["hof-abc123", "hof-abc123: stopped: lease lost", null],
    ["hof-abc123", "hof-def456: delivered", "hof-abc123"],
    ["hof-abc123", "taking no new work: busy", "hof-abc123"],
  ] as const)("from %s after %j", (before, line, after) => {
    expect(taskAfterLine(before, line)).toBe(after);
  });
});

describe("restartDelay", () => {
  it.each([
    [1, 5],
    [2, 10],
    [4, 40],
    [7, 300],
    [20, 300],
  ])("after %i failures waits %i s", (failures, seconds) => {
    expect(Duration.toSeconds(restartDelay(failures))).toBe(seconds);
  });
});
