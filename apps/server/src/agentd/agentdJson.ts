import type {
  AgentdApproval,
  AgentdApprovalListJson,
  AgentdDoctorJson,
  AgentdHandoffListJsonRow,
  AgentdHandoffShowJson,
  AgentdHolder,
  AgentdInboxItem,
  AgentdInboxListJson,
  AgentdPerson,
  AgentdRunsOn,
  AgentdStatus,
  AgentdTask,
  AgentdTaskRow,
  AgentdUserListJson,
  AgentdWhoJson,
} from "@t3tools/contracts";

const WORKER_TOOLS = new Set(["claude", "codex", "opencode"]);

// agentd names a session after its tool: "codex-615065aa16".
function toolOfSession(session: string | null | undefined): string | null {
  const tool = session?.match(/^([a-z]+)-[0-9a-f]+$/)?.[1];
  return tool !== undefined && WORKER_TOOLS.has(tool) ? tool : null;
}

function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}

export function agentdStatus(version: string, doctor: AgentdDoctorJson): AgentdStatus {
  return {
    version: version.trim(),
    ok: doctor.ok ?? doctor.checks.every((check) => check.status !== "fail"),
    setUp: doctor.set_up ?? true,
    checks: doctor.checks.map((check) => ({
      id: check.id,
      status: check.status,
      detail: check.detail ?? null,
      fix: check.fix ?? null,
    })),
  };
}

export function agentdTaskRow(row: AgentdHandoffListJsonRow): AgentdTaskRow {
  return {
    id: row.id,
    title: nonEmpty(row.title) ?? row.goal ?? "",
    state: row.state,
    workerState: nonEmpty(row.worker_state),
    workerRunning: row.worker_running === true,
    workerTool: toolOfSession(row.claimer),
    runsOn: nonEmpty(row.cloud_state) === null ? "local" : "cloud",
    project: nonEmpty(row.project),
    issue: nonEmpty(row.issue),
    started: null,
    branch: null,
    updated: nonEmpty(row.updated),
  };
}

function runsOn(show: AgentdHandoffShowJson): AgentdRunsOn {
  if (nonEmpty(show.cloud_state) !== null) return "cloud";
  return nonEmpty(show.lease_device) === null ? "local" : "team";
}

export function agentdTask(show: AgentdHandoffShowJson): AgentdTask {
  const goal = show.body?.goal ?? "";
  const verdict = show.verdict ?? null;
  const total = show.cost?.total ?? null;
  return {
    id: show.id,
    title: nonEmpty(show.title) ?? goal,
    goal,
    state: show.state,
    workerState: nonEmpty(show.worker_state),
    workerTool: nonEmpty(show.worker_tool) ?? nonEmpty(show.start_tool),
    runsOn: runsOn(show),
    accept: show.accept ?? [],
    check: nonEmpty(show.check_cmd),
    verdict:
      verdict === null
        ? null
        : {
            verdict: verdict.verdict,
            check: verdict.check ?? null,
            delivery: verdict.delivery ?? null,
            next: verdict.next ?? null,
          },
    costUsd: total?.usd ?? null,
    costEstimate: total?.estimate === true,
    budget: nonEmpty(show.budget),
    budgetState: nonEmpty(show.budget_state),
    branch: nonEmpty(show.worker_branch) ?? nonEmpty(show.lease_branch),
    note: nonEmpty(show.worker_note) ?? nonEmpty(show.close_reason),
    project: nonEmpty(show.project),
    hasLog: nonEmpty(show.worker_log) !== null,
    started: nonEmpty(show.created),
    updated: nonEmpty(show.updated),
  };
}

export function agentdApprovals(list: typeof AgentdApprovalListJson.Type): AgentdApproval[] {
  return list.map((approval) => ({
    id: approval.id,
    text: approval.text,
    action: approval.action ?? null,
    handoff: nonEmpty(approval.handoff),
    project: nonEmpty(approval.project),
    ref: nonEmpty(approval.ref),
    requiredRole: nonEmpty(approval.required_role),
    created: nonEmpty(approval.created),
  }));
}

export function agentdInbox(list: typeof AgentdInboxListJson.Type): AgentdInboxItem[] {
  return list.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: nonEmpty(item.title) ?? item.goal ?? "",
    handoff: nonEmpty(item.handoff),
    at: nonEmpty(item.at),
    read: item.read === true,
    resolved: item.resolved === true,
  }));
}

export function agentdPeople(list: typeof AgentdUserListJson.Type): AgentdPerson[] {
  return list.map((user) => ({ name: user.name, role: user.role, created: user.created ?? null }));
}

export function agentdHolders(who: typeof AgentdWhoJson.Type): AgentdHolder[] {
  return (who.holders ?? []).map((holder) => ({
    user: nonEmpty(holder.user),
    tool: nonEmpty(holder.tool),
    node: nonEmpty(holder.node),
    path: nonEmpty(holder.path),
    since: nonEmpty(holder.since),
  }));
}
