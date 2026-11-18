import type { AgentdNode, AgentdTaskRow } from "@t3tools/contracts";

interface TeamActivity {
  name: string | null;
  node: AgentdNode | null;
  tasks: AgentdTaskRow[];
}

export function groupWorkerActivity(rows: readonly AgentdTaskRow[], nodes: readonly AgentdNode[]) {
  const local: AgentdTaskRow[] = [];
  const cloud: AgentdTaskRow[] = [];
  const team = new Map<string | null, TeamActivity>(
    nodes.map((node) => [node.name, { name: node.name, node, tasks: [] }]),
  );
  for (const row of rows) {
    if (row.runsOn === "local") {
      if (row.workerRunning) local.push(row);
    } else if (row.state === "claimed") {
      if (row.runsOn === "cloud") {
        cloud.push(row);
      } else {
        const name = row.workerName ?? null;
        const activity = team.get(name) ?? { name, node: null, tasks: [] };
        activity.tasks.push(row);
        team.set(name, activity);
      }
    }
  }
  return { local, team: [...team.values()], cloud };
}
