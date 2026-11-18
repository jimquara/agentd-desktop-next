import {
  AgentdStartTaskInput,
  AgentdWorkerTool,
  type MessageId,
  type OrchestrationV2ThreadProjection,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

export const TASK_TEXT_LIMIT = 4000;
export const TASK_ACCEPT_LIMIT = 20;
export const TASK_BUDGET_LIMIT = 14;
export const TASK_ISSUE_LIMIT = 212;
export const TASK_WORKERS = {
  claude: "Claude Code",
  codex: "Codex",
  opencode: "opencode",
} satisfies Record<AgentdWorkerTool, string>;

export interface TaskFields {
  readonly goal: string;
  readonly accept: string;
  readonly check: string;
  readonly worker: AgentdWorkerTool | null;
  readonly budget: string;
  readonly issue: string;
}

export const EMPTY_TASK_FIELDS: TaskFields = {
  goal: "",
  accept: "",
  check: "",
  worker: null,
  budget: "",
  issue: "",
};

const isBudget = Schema.is(AgentdStartTaskInput.fields.budget);
const isIssue = Schema.is(AgentdStartTaskInput.fields.issue);
const isTaskText = (text: string) =>
  text.length <= TASK_TEXT_LIMIT && !text.startsWith("-") && !text.includes("\0");

export function prepareTaskFields(fields: TaskFields) {
  const accept = fields.accept
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const input = {
    goal: fields.goal.trim(),
    accept,
    check: fields.check.trim(),
    budget: fields.budget.trim(),
    issue: fields.issue.trim() || null,
  };

  return {
    input,
    goal: input.goal === "" ? "required" : !isTaskText(input.goal) ? "invalid" : null,
    check: input.check === "" ? "required" : !isTaskText(input.check) ? "invalid" : null,
    budget:
      input.budget === ""
        ? "required"
        : !isBudget(input.budget) ||
            input.budget.split(",").some((limit) => parseFloat(limit.replace("$", "")) <= 0)
          ? "invalid"
          : null,
    accept:
      fields.accept.length > TASK_TEXT_LIMIT ||
      accept.length > TASK_ACCEPT_LIMIT ||
      !accept.every(isTaskText),
    issue: !isIssue(input.issue),
  } as const;
}

export function taskBranchProblem(status: {
  readonly isRepo: boolean;
  readonly refName: string | null;
}) {
  if (!status.isRepo) return "not-repo";
  if (status.refName === null) return "detached";
  if (status.refName === "main" || status.refName === "master") return "protected";
  return null;
}

export const TASK_DRAFT_PROMPT = `Draft an AgentD worker task from this conversation. Draft only: do not call tools, run commands, change files, create or dispatch a task, or request approval. I will review the fields myself.
Respond with only a JSON object in this exact shape:
{"goal":"","accept":[],"check":"","worker":null,"budget":"","issue":""}
Write up to ${TASK_ACCEPT_LIMIT} acceptance criteria as an array of single-line strings. Suggest a check command but do not run it. Leave the budget and issue empty unless we discussed them. A budget uses minutes (30m), dollars ($2), or both (30m,$2); an issue uses OWNER/REPO#123. Leave worker null unless I asked for claude, codex, or opencode. Use empty strings for unknown fields.`;

const draftSchema = Schema.Struct({
  goal: Schema.String.check(Schema.isMaxLength(TASK_TEXT_LIMIT)),
  accept: Schema.Array(Schema.String.check(Schema.isMaxLength(TASK_TEXT_LIMIT))).check(
    Schema.isMaxLength(TASK_ACCEPT_LIMIT),
  ),
  check: Schema.String.check(Schema.isMaxLength(TASK_TEXT_LIMIT)),
  worker: Schema.NullOr(AgentdWorkerTool),
  budget: Schema.String.check(Schema.isMaxLength(TASK_BUDGET_LIMIT)),
  issue: Schema.String.check(Schema.isMaxLength(TASK_ISSUE_LIMIT)),
});
const decodeDraft = Schema.decodeUnknownOption(Schema.fromJsonString(draftSchema));

function parseTaskDraft(reply: string): TaskFields | null {
  const text = reply.trim();
  const fenced = /^```(?:json)?[\t ]*\r?\n([\s\S]*?)\r?\n```$/i.exec(text)?.[1];
  const decoded = decodeDraft(fenced ?? text);
  if (decoded._tag === "None") return null;
  const { accept, worker, ...fields } = decoded.value;
  const acceptanceText = accept.join("\n");
  if (acceptanceText.length > TASK_TEXT_LIMIT || accept.some((line) => /[\r\n]/.test(line)))
    return null;
  return { ...fields, accept: acceptanceText, worker };
}

export function conversationTaskDraft(
  projection: Pick<OrchestrationV2ThreadProjection, "runs" | "turnItems"> | undefined,
  messageId: MessageId,
):
  | { readonly kind: "waiting" | "failed" }
  | { readonly kind: "ready"; readonly fields: TaskFields } {
  const run = projection?.runs.find((candidate) => candidate.userMessageId === messageId);
  if (run === undefined || run.completedAt === null) return { kind: "waiting" };
  if (run.status !== "completed") return { kind: "failed" };
  const reply = projection?.turnItems.findLast(
    (item) =>
      item.runId === run.id &&
      item.type === "assistant_message" &&
      item.phase !== "commentary" &&
      !item.streaming,
  );
  const fields = reply?.type === "assistant_message" ? parseTaskDraft(reply.text) : null;
  return fields === null ? { kind: "failed" } : { kind: "ready", fields };
}
