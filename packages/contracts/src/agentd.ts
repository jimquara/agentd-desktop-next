import * as Schema from "effect/Schema";

// agentd is the authority for tasks, approvals and workers; these are its `--json` answers as the
// server reads them and the shapes it serves. Fields agentd may leave out are optional or null.

export const AgentdHandoffId = Schema.String.check(Schema.isPattern(/^hof-[0-9a-f]{6,32}$/));
export type AgentdHandoffId = typeof AgentdHandoffId.Type;

export const AgentdWorkerTool = Schema.Literals(["claude", "codex", "opencode"]);
export type AgentdWorkerTool = typeof AgentdWorkerTool.Type;

export class AgentdNotFoundError extends Schema.TaggedError<AgentdNotFoundError>()(
  "AgentdNotFoundError",
  { message: Schema.String },
) {}

export class AgentdCommandError extends Schema.TaggedError<AgentdCommandError>()(
  "AgentdCommandError",
  {
    message: Schema.String,
    /** agentd answered that it is not set up yet (`agentd init` has not run). */
    notSetUp: Schema.Boolean,
  },
) {}

export const AgentdError = Schema.Union([AgentdNotFoundError, AgentdCommandError]);
export type AgentdError = typeof AgentdError.Type;

const NullableString = Schema.optionalKey(Schema.NullOr(Schema.String));

export const AgentdDoctorJson = Schema.Struct({
  ok: Schema.optionalKey(Schema.Boolean),
  set_up: Schema.optionalKey(Schema.Boolean),
  checks: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      status: Schema.String,
      detail: Schema.optionalKey(Schema.String),
      fix: Schema.optionalKey(Schema.String),
    }),
  ),
});
export type AgentdDoctorJson = typeof AgentdDoctorJson.Type;

export const AgentdHandoffListJsonRow = Schema.Struct({
  id: Schema.String,
  title: NullableString,
  goal: NullableString,
  state: Schema.String,
  worker_state: NullableString,
  worker_running: Schema.optionalKey(Schema.Boolean),
  worker_cwd: NullableString,
  claimer: NullableString,
  claimer_user: NullableString,
  cloud_state: NullableString,
  project: NullableString,
  issue: NullableString,
  updated: NullableString,
  version: Schema.optionalKey(Schema.Number),
});
export type AgentdHandoffListJsonRow = typeof AgentdHandoffListJsonRow.Type;

export const AgentdHandoffListJson = Schema.Array(AgentdHandoffListJsonRow);

export const AgentdHandoffShowJson = Schema.Struct({
  id: Schema.String,
  state: Schema.String,
  title: NullableString,
  body: Schema.optionalKey(Schema.NullOr(Schema.Struct({ goal: NullableString }))),
  accept: Schema.optionalKey(Schema.NullOr(Schema.Array(Schema.String))),
  check_cmd: NullableString,
  verdict: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        verdict: Schema.String,
        check: NullableString,
        delivery: NullableString,
        next: NullableString,
      }),
    ),
  ),
  cost: Schema.optionalKey(
    Schema.NullOr(
      Schema.Struct({
        total: Schema.optionalKey(
          Schema.NullOr(
            Schema.Struct({
              usd: Schema.optionalKey(Schema.NullOr(Schema.Number)),
              estimate: Schema.optionalKey(Schema.Boolean),
            }),
          ),
        ),
      }),
    ),
  ),
  budget: NullableString,
  budget_state: NullableString,
  worker_state: NullableString,
  worker_tool: NullableString,
  start_tool: NullableString,
  worker_branch: NullableString,
  lease_branch: NullableString,
  lease_device: NullableString,
  cloud_state: NullableString,
  worker_log: NullableString,
  worker_note: NullableString,
  close_reason: NullableString,
  project: NullableString,
  created: NullableString,
  updated: NullableString,
});
export type AgentdHandoffShowJson = typeof AgentdHandoffShowJson.Type;

export const AgentdApprovalListJson = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    text: Schema.String,
    action: NullableString,
    handoff: NullableString,
    project: NullableString,
    ref: NullableString,
    session: NullableString,
    required_role: NullableString,
    created: NullableString,
  }),
);

export const AgentdInboxListJson = Schema.Array(
  Schema.Struct({
    id: Schema.String,
    kind: Schema.String,
    from: NullableString,
    claimer: NullableString,
    title: NullableString,
    goal: NullableString,
    handoff: NullableString,
    at: NullableString,
    read: Schema.optionalKey(Schema.Boolean),
    resolved: Schema.optionalKey(Schema.Boolean),
  }),
);

export const AgentdUserListJson = Schema.Array(
  Schema.Struct({ name: Schema.String, role: Schema.String, created: NullableString }),
);

export const AgentdWhoJson = Schema.Struct({
  holders: Schema.optionalKey(
    Schema.NullOr(
      Schema.Array(
        Schema.Struct({
          user: NullableString,
          session: NullableString,
          tool: NullableString,
          node: NullableString,
          path: NullableString,
          resource: NullableString,
          since: NullableString,
        }),
      ),
    ),
  ),
});

export const AgentdDoctorCheck = Schema.Struct({
  id: Schema.String,
  status: Schema.String,
  detail: Schema.NullOr(Schema.String),
  fix: Schema.NullOr(Schema.String),
});
export type AgentdDoctorCheck = typeof AgentdDoctorCheck.Type;

/** The desktop app's last pass installing its agentd and Skills for the terminal and agents. */
export const AgentdInstallRecord = Schema.Struct({
  action: Schema.Literals(["installed", "replaced", "unchanged", "kept-newer", "kept-unknown"]),
  /** The install.sh location; a kept agentd there is the person's own. */
  path: Schema.String,
  directory: Schema.String,
  onPath: Schema.Boolean,
  /** The line to add to a shell profile when the folder is not on PATH; the app never edits one. */
  pathLine: Schema.NullOr(Schema.String),
  skills: Schema.Array(Schema.String),
});
export type AgentdInstallRecord = typeof AgentdInstallRecord.Type;

export const AgentdStatus = Schema.Struct({
  /** `agentd version` as it printed it, such as "agentd v0.1.13 0d0b360a58c0". */
  version: Schema.String,
  ok: Schema.Boolean,
  setUp: Schema.Boolean,
  defaultWorker: Schema.optionalKey(Schema.NullOr(AgentdWorkerTool)),
  teamServer: NullableString,
  checks: Schema.Array(AgentdDoctorCheck),
  /** The agentd binary the app runs. */
  binary: Schema.optionalKey(Schema.String),
  install: Schema.optionalKey(Schema.NullOr(AgentdInstallRecord)),
});
export type AgentdStatus = typeof AgentdStatus.Type;

/** Where a task's worker runs: this machine, a team node that leased it, or agentd's cloud. */
export const AgentdRunsOn = Schema.Literals(["local", "team", "cloud"]);
export type AgentdRunsOn = typeof AgentdRunsOn.Type;

export const AgentdTaskRow = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  state: Schema.String,
  workerState: Schema.NullOr(Schema.String),
  workerRunning: Schema.Boolean,
  /** From the claiming session; `handoff list` names no worker tool. */
  workerTool: Schema.NullOr(Schema.String),
  workerName: NullableString,
  /** The checkout the task was offered in; the worker runs in a worktree of it. */
  workerCwd: NullableString,
  runsOn: AgentdRunsOn,
  project: Schema.NullOr(Schema.String),
  issue: Schema.NullOr(Schema.String),
  /** Null in the list: `handoff list --json` carries neither; `agentd.task` has both. */
  started: Schema.NullOr(Schema.String),
  branch: Schema.NullOr(Schema.String),
  updated: Schema.NullOr(Schema.String),
});
export type AgentdTaskRow = typeof AgentdTaskRow.Type;

export const AgentdTaskVerdict = Schema.Struct({
  verdict: Schema.String,
  check: Schema.NullOr(Schema.String),
  delivery: Schema.NullOr(Schema.String),
  next: Schema.NullOr(Schema.String),
});
export type AgentdTaskVerdict = typeof AgentdTaskVerdict.Type;

export const AgentdTask = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  goal: Schema.String,
  state: Schema.String,
  workerState: Schema.NullOr(Schema.String),
  workerTool: Schema.NullOr(Schema.String),
  runsOn: AgentdRunsOn,
  accept: Schema.Array(Schema.String),
  check: Schema.NullOr(Schema.String),
  verdict: Schema.NullOr(AgentdTaskVerdict),
  costUsd: Schema.NullOr(Schema.Number),
  costEstimate: Schema.Boolean,
  budget: Schema.NullOr(Schema.String),
  budgetState: Schema.NullOr(Schema.String),
  branch: Schema.NullOr(Schema.String),
  note: Schema.NullOr(Schema.String),
  project: Schema.NullOr(Schema.String),
  hasLog: Schema.Boolean,
  started: Schema.NullOr(Schema.String),
  updated: Schema.NullOr(Schema.String),
});
export type AgentdTask = typeof AgentdTask.Type;

export const AgentdApproval = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  requester: NullableString,
  action: Schema.NullOr(Schema.String),
  handoff: Schema.NullOr(Schema.String),
  project: Schema.NullOr(Schema.String),
  ref: Schema.NullOr(Schema.String),
  requiredRole: Schema.NullOr(Schema.String),
  created: Schema.NullOr(Schema.String),
});
export type AgentdApproval = typeof AgentdApproval.Type;

export const AgentdInboxItem = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  title: Schema.String,
  requester: NullableString,
  handoff: Schema.NullOr(Schema.String),
  at: Schema.NullOr(Schema.String),
  read: Schema.Boolean,
  resolved: Schema.Boolean,
});
export type AgentdInboxItem = typeof AgentdInboxItem.Type;

export const AgentdPerson = Schema.Struct({
  name: Schema.String,
  role: Schema.String,
  created: Schema.NullOr(Schema.String),
});
export type AgentdPerson = typeof AgentdPerson.Type;

export const AgentdHolder = Schema.Struct({
  user: Schema.NullOr(Schema.String),
  tool: Schema.NullOr(Schema.String),
  node: Schema.NullOr(Schema.String),
  path: Schema.NullOr(Schema.String),
  since: Schema.NullOr(Schema.String),
});
export type AgentdHolder = typeof AgentdHolder.Type;

export const AgentdNode = Schema.Struct({
  name: Schema.String,
  host: Schema.String,
  person: Schema.NullOr(Schema.String),
  state: Schema.String,
  why: Schema.NullOr(Schema.String),
  seen: Schema.String,
  offline: Schema.Boolean,
});
export type AgentdNode = typeof AgentdNode.Type;

export const AgentdPeople = Schema.Struct({
  people: Schema.Array(AgentdPerson),
  /** Who works at `target` now (`agentd who`); empty without a target. */
  holders: Schema.Array(AgentdHolder),
  nodes: Schema.optionalKey(Schema.Array(AgentdNode)),
});
export type AgentdPeople = typeof AgentdPeople.Type;

const TaskText = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4000));
// POSIX, a Windows drive (C:\ or C:/) or a UNC share (\\host\share).
const AbsolutePath = Schema.String.check(Schema.isPattern(/^(?:\/|[A-Za-z]:[\\/]|\\\\[^\\])/));
const IssueRef = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9][\w.-]{0,99}\/[\w.-]{1,100}#[1-9]\d{0,9}$/),
);

export const AgentdTaskInput = Schema.Struct({ id: AgentdHandoffId });
export type AgentdTaskInput = typeof AgentdTaskInput.Type;

export const AgentdStopTaskInput = Schema.Struct({ id: AgentdHandoffId, reason: TaskText });
export type AgentdStopTaskInput = typeof AgentdStopTaskInput.Type;

export const AgentdStartTaskInput = Schema.Struct({
  goal: TaskText,
  accept: Schema.Array(TaskText).check(Schema.isMaxLength(20)),
  /** Null runs the task with no check (`--no-check`). */
  check: Schema.NullOr(TaskText),
  worker: AgentdWorkerTool,
  budget: Schema.String.check(
    Schema.isPattern(/^(?:\d{1,4}m|\$\d{1,4}(?:\.\d{1,2})?|\d{1,4}m,\$\d{1,4}(?:\.\d{1,2})?)$/),
  ),
  cwd: AbsolutePath,
  issue: Schema.NullOr(IssueRef),
});
export type AgentdStartTaskInput = typeof AgentdStartTaskInput.Type;

export const AgentdStartTaskResult = Schema.Struct({
  id: Schema.String,
  started: Schema.Boolean,
  /** Why dispatch failed; the task stays offered in agentd. */
  note: Schema.NullOr(Schema.String),
});
export type AgentdStartTaskResult = typeof AgentdStartTaskResult.Type;

export const AgentdPeopleInput = Schema.Struct({
  target: Schema.optionalKey(Schema.Union([AbsolutePath, IssueRef])),
  includeNodes: Schema.optionalKey(Schema.Boolean),
});
export type AgentdPeopleInput = typeof AgentdPeopleInput.Type;

export const AgentdConnectAgentInput = Schema.Struct({
  agent: AgentdWorkerTool,
  dryRun: Schema.Boolean,
});
export type AgentdConnectAgentInput = typeof AgentdConnectAgentInput.Type;

export const AgentdJoinTeamInput = Schema.Struct({
  server: Schema.String.check(Schema.isMaxLength(2048)),
  /** Goes to agentd's stdin only, never into an argument list or a log. */
  ticket: Schema.String.check(Schema.isMaxLength(256)),
});
export type AgentdJoinTeamInput = typeof AgentdJoinTeamInput.Type;

/** What agentd printed for a command with no JSON answer (connect, join). */
export const AgentdCommandOutput = Schema.Struct({ output: Schema.String });
export type AgentdCommandOutput = typeof AgentdCommandOutput.Type;

/** This environment as a team node: `agentd worker --accept-server-work`, run by the server. */
export const AgentdTeamNodeState = Schema.Literals(["off", "waiting", "working", "failed"]);
export type AgentdTeamNodeState = typeof AgentdTeamNodeState.Type;

export const AgentdTeamNodeStatus = Schema.Struct({
  on: Schema.Boolean,
  tool: Schema.NullOr(AgentdWorkerTool),
  repo: Schema.NullOr(Schema.String),
  state: AgentdTeamNodeState,
  /** The task the node's worker leased, while working. */
  task: Schema.NullOr(Schema.String),
  /** What agentd said when the worker failed or ended. */
  note: Schema.NullOr(Schema.String),
  /** Installed agents among claude, codex and opencode. */
  tools: Schema.Array(AgentdWorkerTool),
});
export type AgentdTeamNodeStatus = typeof AgentdTeamNodeStatus.Type;

export const AgentdTeamNodeInput = Schema.Struct({
  on: Schema.Boolean,
  tool: AgentdWorkerTool,
  repo: AbsolutePath,
  /** A worker enrolment ticket, if agentd needs one; goes to agentd's stdin only. */
  ticket: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
});
export type AgentdTeamNodeInput = typeof AgentdTeamNodeInput.Type;
