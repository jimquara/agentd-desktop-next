import type { AgentdTaskRow, AgentdTaskVerdict } from "@t3tools/contracts";
import { msg } from "gt-react";

import { m, type MessageResolver } from "../../i18n/messages";

export function isFinishedAgentdTask(state: string): boolean {
  return state === "done" || state === "delivered" || state === "cancelled" || state === "declined";
}

export function runningAgentdTaskLabel(
  {
    state,
    workerState,
    workerRunning,
  }: Pick<AgentdTaskRow, "state" | "workerState" | "workerRunning">,
  budgetState: string | null,
  resolve: MessageResolver = m,
): string {
  if (
    workerState === "blocked" ||
    workerState === "waiting_answer" ||
    budgetState === "budget_exceeded"
  ) {
    return resolve(msg("Waiting for a person"));
  }
  if (workerState === "gone") return resolve(msg("Worker exited"));
  if (workerState === "stopped" || budgetState === "stopped") return resolve(msg("Worker stopped"));
  if (workerRunning) return resolve(msg("Running", { $context: "status of background work" }));
  if (state === "blocked") return resolve(msg("Waiting for other tasks"));
  if (state === "offered") return resolve(msg("Queued", { $context: "status of background work" }));
  if (state === "held") return resolve(msg("On hold", { $context: "status of background work" }));
  return resolve(msg("Assigned", { $context: "status of background work" }));
}

export function finishedAgentdTaskLabel(
  state: string,
  verdict: Pick<AgentdTaskVerdict, "verdict" | "check"> | null,
  resolve: MessageResolver = m,
): string {
  if (state === "cancelled")
    return resolve(msg("Stopped", { $context: "result of background work" }));
  if (state === "declined" || /^(?:failed|timed_out)(?=:|\s|$)/.test(verdict?.check ?? "")) {
    return resolve(msg("Failed", { $context: "result of background work" }));
  }
  if (verdict?.verdict === "verified") {
    return resolve(msg("Verified", { $context: "result of background work" }));
  }
  if (verdict === null) return resolve(msg("Result unavailable"));
  return resolve(msg("Needs work", { $context: "result of background work" }));
}
