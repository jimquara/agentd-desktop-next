import { describe, expect, it } from "@effect/vitest";

import { agentdStatus } from "./agentdJson.ts";
import { initPhase, initPrompt, terminalText } from "./agentdInit.ts";

describe("initPrompt", () => {
  it.each([
    ["Accept the AgentD End User Agreement 3.5? Type yes to accept: ", "eula"],
    ["Type yes to accept:", "eula"],
    ["Activation code: ", "other"],
    ["Route implementation through agentd? [Y/n] ", "other"],
    ["Continue?", "other"],
    ["Type yes to accept: yes", null],
    ["services  writing units", null],
    ["", null],
  ] as const)("%j asks %s", (line, asks) => {
    expect(initPrompt(line)).toBe(asks);
  });
});

describe("initPhase", () => {
  it.each([
    [0, null, "succeeded"],
    [3, null, "succeeded"],
    [1, null, "failed"],
    [2, null, "failed"],
    [null, "timeout", "failed"],
    [3, "prompt", "failed"],
  ] as const)("exit %s, stopped %s: %s", (exitCode, stopped, phase) => {
    expect(initPhase(exitCode, stopped)).toBe(phase);
  });
});

describe("terminalText", () => {
  it("drops colours, cursor moves and carriage returns", () => {
    expect(terminalText("\u001b[1meula\u001b[0m  ok\r\n\u001b]0;agentd\u0007next\r\n")).toBe(
      "eula  ok\nnext\n",
    );
  });
});

describe("agentdStatus setUp", () => {
  const doctor = (setUp: boolean, activation: string) => ({
    set_up: setUp,
    checks: [{ id: "activation", status: "optional", detail: activation }],
  });
  it.each([
    [true, "not linked to a LibraOS account (optional); EULA eula-draft-3.5 accepted", "3.5", true],
    [true, "not linked (optional); the EULA is not accepted on this machine yet", "3.5", false],
    [
      true,
      "not linked to a LibraOS account (optional); EULA eula-draft-3.4 accepted",
      "3.5",
      false,
    ],
    [true, "activated for the beta on 2026-11-01; EULA 3.5 accepted", null, true],
    [false, "not linked to a LibraOS account (optional); EULA 3.5 accepted", "3.5", false],
  ] as const)("set_up %s, %j, carrying %s: %s", (setUp, activation, carried, expected) => {
    expect(agentdStatus("agentd v0.1.13", doctor(setUp, activation), carried).setUp).toBe(expected);
  });
});
