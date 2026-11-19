import { describe, expect, it } from "@effect/vitest";

import { cloudJobNote } from "./agentdCloud.ts";
import { CLOUD_REASONS } from "./cloudFailure.ts";

describe("cloudJobNote", () => {
  it.each([
    ["failed", "OAuth access token is invalid (401)", CLOUD_REASONS.subscriptionSignIn],
    ["failed", "API Error: 401 authentication_error", CLOUD_REASONS.subscriptionSignIn],
    ["failed", "claude subscription jobs are not enabled", CLOUD_REASONS.subscriptionUnavailable],
    ["failed", "the GitHub App is not installed on acme/app", CLOUD_REASONS.repository],
    ["failed", "check exited 1", CLOUD_REASONS.check],
    ["failed", "git push refused by GitHub", CLOUD_REASONS.push],
    ["failed", "Job API 502", "The cloud worker could not finish the task."],
    ["budget_exceeded", "", "The task reached its spending limit."],
    // A path naming byok or cloud-key is not a key or setup problem.
    [
      "failed",
      "wrote /home/me/byok/cloud-key/out.log",
      "The cloud worker could not finish the task.",
    ],
    ["submitting", "402: insufficient credit", CLOUD_REASONS.credit],
    ["running", "runner starting, timed out once", null],
    ["completed", "the GitHub App is not installed on acme/app", CLOUD_REASONS.repository],
  ] as const)("%s: %s", (state, message, note) => {
    expect(cloudJobNote(state, [message])).toBe(note);
  });
});
