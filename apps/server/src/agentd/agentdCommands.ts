import * as Schema from "effect/Schema";
import type {
  AgentdCloudTaskInput,
  AgentdConnectAgentInput,
  AgentdStartTaskInput,
  AgentdWorkerTool,
} from "@t3tools/contracts";

// Every agentd command the server runs, as a fixed argument list. Client text reaches one only as a
// validated id, path, URL or task field, never as a flag; the joinTeam ticket goes on stdin.

const HANDOFF_ID = /^hof-[0-9a-f]{6,32}$/;
const TICKET = /^adt_[A-Za-z0-9_-]{16,200}$/;

export class AgentdArgumentError extends Schema.TaggedError<AgentdArgumentError>()(
  "AgentdArgumentError",
  { message: Schema.String },
) {}

function handoffId(value: string): string {
  if (!HANDOFF_ID.test(value)) throw new AgentdArgumentError({ message: "not an agentd task id" });
  return value;
}

// agentd would read a leading dash as one of its own flags.
function text(name: string, value: string): string {
  if (value.trim() === "" || value.includes("\0")) {
    throw new AgentdArgumentError({ message: `${name} is empty or has a NUL` });
  }
  if (value.trimStart().startsWith("-")) {
    throw new AgentdArgumentError({ message: `${name} cannot start with "-"` });
  }
  return value;
}

const CLOUD_SESSION = "agentd-new";

/** An agentd server's address: http(s) with a host, normalized so agentd cannot read it as a flag. */
function agentdServerUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new AgentdArgumentError({
      message: "the server address must be an http:// or https:// URL",
    });
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.hostname === "") {
    throw new AgentdArgumentError({
      message: "the server address must be an http:// or https:// URL",
    });
  }
  return url.origin + url.pathname.replace(/\/+$/, "");
}

export function agentdTicket(value: string): string {
  const ticket = value.trim();
  if (!TICKET.test(ticket)) {
    throw new AgentdArgumentError({ message: "that is not an agentd ticket (one starts adt_)" });
  }
  return ticket;
}

export const agentdArgs = {
  version: () => ["version"],
  doctor: () => ["doctor", "--json"],
  defaultWorker: () => ["config", "get", "dispatch.default_tool"],
  list: () => ["handoff", "list", "--json"],
  show: (id: string) => ["handoff", "show", handoffId(id), "--json"],
  approvals: () => ["approval", "list", "--state", "pending", "--json"],
  inbox: () => ["inbox", "list", "--mine", "--json"],
  users: () => ["user", "list", "--json"],
  nodes: () => ["server", "nodes", "--json"],
  who: (target: string) => ["who", text("target", target), "--json"],
  cancel: (id: string, reason: string) => [
    "handoff",
    "done",
    handoffId(id),
    "--cancel",
    "--reason",
    text("reason", reason),
  ],
  // `new` only offers: dispatch gives the worker its own worktree instead of the person's checkout.
  new: (input: AgentdStartTaskInput) => [
    "new",
    text("goal", input.goal),
    ...input.accept.flatMap((line, i) => ["--accept", text(`acceptance line ${i + 1}`, line)]),
    ...(input.check === null ? ["--no-check"] : ["--verify", text("check", input.check)]),
    ...(input.issue === null ? [] : ["--issue", input.issue]),
    "--worker",
    input.worker,
    "--budget",
    input.budget,
    "--cwd",
    input.cwd,
    "--no-start",
  ],
  dispatch: (id: string, worker: AgentdWorkerTool) => [
    "handoff",
    "dispatch",
    handoffId(id),
    "--tool",
    worker,
  ],
  connectAgent: (input: AgentdConnectAgentInput) => [
    "connect",
    input.agent,
    ...(input.dryRun ? ["--dry-run"] : []),
  ],
  joinTeam: (server: string) => [
    "connect",
    "--server",
    agentdServerUrl(server),
    "--ticket-file",
    "-",
  ],
  cloudHelp: () => ["handoff", "offer", "--help"],
  cloudBalance: () => ["cloud", "balance", "--json"],
  cloudSession: (cwd: string) => [
    "session",
    "join",
    "--id",
    CLOUD_SESSION,
    "--tool",
    "other",
    "--label",
    "agentd new",
    "--wake",
    "pull",
    "--cwd",
    text("working directory", cwd),
  ],
  cloudOffer: (input: AgentdCloudTaskInput, project: string) => [
    "handoff",
    "offer",
    "--cloud",
    "--to",
    "any",
    "--session",
    CLOUD_SESSION,
    "--budget",
    input.cloud.budget,
    "--model-access",
    input.cloud.modelAccess,
    ...(input.cloud.modelAccess === "byok" && input.cloud.anthropicKeyFile !== undefined
      ? ["--anthropic-key-file", text("Anthropic key file", input.cloud.anthropicKeyFile)]
      : []),
    ...(input.cloud.modelAccess === "byok" && input.cloud.openaiKeyFile !== undefined
      ? ["--openai-key-file", text("OpenAI key file", input.cloud.openaiKeyFile)]
      : []),
    "--project",
    project,
    "--goal",
    text("goal", input.goal),
    ...input.accept.flatMap((line, index) => [
      "--accept",
      text(`acceptance line ${index + 1}`, line),
    ]),
    ...(input.check === null ? ["--no-check"] : ["--check", text("check", input.check)]),
    "--json",
  ],
} as const;
