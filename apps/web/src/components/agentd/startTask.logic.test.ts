import { MessageId, ProviderInstanceId } from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import { expect, it } from "vite-plus/test";

import { makeStreamingTimelineFixture } from "~/test-fixtures";
import { conversationTaskDraft, EMPTY_TASK_FIELDS, prepareTaskFields } from "./startTask.logic";

it("validates the handoff fields before sending the trimmed CLI inputs", () => {
  const fields = {
    ...EMPTY_TASK_FIELDS,
    goal: "  Fix export  ",
    accept: " Keeps sort order \r\n\r\n Does not duplicate rows ",
    check: " pnpm test ",
    budget: " 45m,$3.10 ",
    issue: " libraos/agentd-desktop-next#21 ",
  };
  expect(prepareTaskFields(fields)).toEqual({
    input: {
      goal: "Fix export",
      accept: ["Keeps sort order", "Does not duplicate rows"],
      check: "pnpm test",
      budget: "45m,$3.10",
      issue: "libraos/agentd-desktop-next#21",
    },
    goal: null,
    check: null,
    budget: null,
    accept: false,
    issue: false,
  });
  expect(
    prepareTaskFields({
      ...fields,
      goal: " ",
      check: "--no-check",
      budget: "30m,$0",
      accept: Array.from({ length: 21 }, (_, index) => `Criterion ${index}`).join("\n"),
      issue: "#21",
    }),
  ).toMatchObject({
    goal: "required",
    check: "invalid",
    budget: "invalid",
    accept: true,
    issue: true,
  });
});

it("fills the form only from a completed reply to this draft request", () => {
  const format = (goal: string) =>
    JSON.stringify({
      goal,
      accept: ["Keeps the row order", "Preserves empty cells"],
      check: "pnpm test",
      worker: "opencode",
      budget: "",
      issue: "",
    });
  const fixture = makeStreamingTimelineFixture(`\`\`\`json\n${format("Fix export")}\n\`\`\``);
  const date = DateTime.makeUnsafe("2026-11-18T10:00:00Z");
  const provider = ProviderInstanceId.make("opencode");
  const messageId = MessageId.make("live-user");
  const run = {
    id: fixture.runId,
    threadId: fixture.threadId,
    ordinal: 2,
    providerInstanceId: provider,
    modelSelection: { instanceId: provider, model: "fixture" },
    providerThreadId: null,
    userMessageId: messageId,
    rootNodeId: null,
    activeAttemptId: null,
    status: "running" as const,
    requestedAt: date,
    startedAt: date,
    completedAt: null,
    checkpointId: null,
    contextHandoffId: null,
  };
  const turnItems = fixture.visibleTurnItems.map(({ item }) => item);
  const replies = turnItems.filter((item) => item.type === "assistant_message");
  const oldReply = replies.find((item) => !item.streaming)!;
  const reply = replies.find((item) => item.streaming)!;
  expect(conversationTaskDraft({ runs: [run], turnItems }, messageId)).toEqual({ kind: "waiting" });

  const completed = { ...run, status: "completed" as const, completedAt: date };
  const old = { ...oldReply, text: format("Unrelated task") };
  expect(conversationTaskDraft({ runs: [completed], turnItems: [old] }, messageId)).toEqual({
    kind: "failed",
  });
  expect(
    conversationTaskDraft(
      {
        runs: [completed],
        turnItems: [{ ...reply, streaming: false, status: "completed" }, old],
      },
      messageId,
    ),
  ).toEqual({
    kind: "ready",
    fields: {
      goal: "Fix export",
      accept: "Keeps the row order\nPreserves empty cells",
      check: "pnpm test",
      worker: "opencode",
      budget: "",
      issue: "",
    },
  });
});
