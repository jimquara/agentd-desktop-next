import { createAgentdEnvironmentAtoms } from "@t3tools/client-runtime/state/agentd";
import {
  AuthOrchestrationReadScope,
  type AgentdHandoffId,
  type EnvironmentId,
} from "@t3tools/contracts";
import { useMessages } from "gt-react";

import { connectionAtomRuntime } from "../connection/runtime";
import { usePrimaryEnvironment } from "../state/environments";
import { useEnvironmentQuery } from "../state/query";
import { useEnvironmentScope } from "../state/session";
import { useAtomCommand } from "../state/use-atom-command";

/** agentd's atoms; read `permissionAtom` on a command to decide whether to offer it. */
export const agentdEnvironment = createAgentdEnvironmentAtoms(connectionAtomRuntime);

// The primary environment unless one is named; null when it cannot read agentd.
function useAgentdEnvironment(target: EnvironmentId | null | undefined): EnvironmentId | null {
  const primary = usePrimaryEnvironment();
  const environmentId = target === undefined ? (primary?.environmentId ?? null) : target;
  const canRead = useEnvironmentScope(environmentId, AuthOrchestrationReadScope);
  return canRead ? environmentId : null;
}

export function useAgentdStatus(target?: EnvironmentId | null) {
  const environmentId = useAgentdEnvironment(target);
  return useEnvironmentQuery(
    environmentId === null ? null : agentdEnvironment.status({ environmentId, input: {} }),
    useMessages(),
  );
}

export function useAgentdTasks(target?: EnvironmentId | null) {
  const environmentId = useAgentdEnvironment(target);
  return useEnvironmentQuery(
    environmentId === null ? null : agentdEnvironment.tasks({ environmentId, input: {} }),
    useMessages(),
  );
}

export function useAgentdTask(id: AgentdHandoffId | null, target?: EnvironmentId | null) {
  const environmentId = useAgentdEnvironment(target);
  return useEnvironmentQuery(
    environmentId === null || id === null
      ? null
      : agentdEnvironment.task({ environmentId, input: { id } }),
    useMessages(),
  );
}

/** The task's worker log tail while it runs, as a command output view. */
export function useAgentdTaskOutput(id: AgentdHandoffId | null, target?: EnvironmentId | null) {
  const environmentId = useAgentdEnvironment(target);
  return useEnvironmentQuery(
    environmentId === null || id === null
      ? null
      : agentdEnvironment.taskOutput({ environmentId, input: { id } }),
    useMessages(),
  );
}

export function useAgentdApprovals(target?: EnvironmentId | null) {
  const environmentId = useAgentdEnvironment(target);
  return useEnvironmentQuery(
    environmentId === null ? null : agentdEnvironment.approvals({ environmentId, input: {} }),
    useMessages(),
  );
}

export function useAgentdInbox(target?: EnvironmentId | null) {
  const environmentId = useAgentdEnvironment(target);
  return useEnvironmentQuery(
    environmentId === null ? null : agentdEnvironment.inbox({ environmentId, input: {} }),
    useMessages(),
  );
}

export function useAgentdPeople(target?: EnvironmentId | null, includeNodes = false) {
  const environmentId = useAgentdEnvironment(target);
  return useEnvironmentQuery(
    environmentId === null
      ? null
      : agentdEnvironment.people({ environmentId, input: includeNodes ? { includeNodes } : {} }),
    useMessages(),
  );
}

/** Each takes `{ environmentId, input }`; failures are reported like any other command's. */
export function useAgentdCommands() {
  return {
    startTask: useAtomCommand(agentdEnvironment.startTask),
    stopTask: useAtomCommand(agentdEnvironment.stopTask),
    connectAgent: useAtomCommand(agentdEnvironment.connectAgent),
    joinTeam: useAtomCommand(agentdEnvironment.joinTeam),
  };
}
