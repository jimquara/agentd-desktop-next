import { useAtomValue } from "@effect/atom-react";
import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "@t3tools/client-runtime/state/runtime";
import { AuthOrchestrationReadScope, WS_METHODS, type EnvironmentId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import { useMessages } from "gt-react";

import { connectionAtomRuntime } from "../connection/runtime";
import { usePrimaryEnvironment } from "../state/environments";
import { useEnvironmentQuery } from "../state/query";
import { useEnvironmentScope } from "../state/session";
import { useAtomCommand } from "../state/use-atom-command";

// The LibraOS Gateway on one environment. The server keeps the key; clients learn only whether it
// is connected and which models it may use.

const scheduler = createAtomCommandScheduler();

const status = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:libraos-gateway:status",
  tag: WS_METHODS.libraosGatewayStatus,
  staleTimeMs: 60_000,
});

const refreshStatus = (
  target: { readonly environmentId: EnvironmentId },
  registry: { readonly refresh: (atom: ReturnType<typeof status>) => void },
) =>
  Effect.sync(() => registry.refresh(status({ environmentId: target.environmentId, input: {} })));

const libraosGatewayEnvironment = {
  status,
  connect: createEnvironmentRpcCommand(connectionAtomRuntime, {
    label: "environment-data:libraos-gateway:connect",
    tag: WS_METHODS.libraosGatewayConnect,
    scheduler,
    onSettled: refreshStatus,
  }),
  disconnect: createEnvironmentRpcCommand(connectionAtomRuntime, {
    label: "environment-data:libraos-gateway:disconnect",
    tag: WS_METHODS.libraosGatewayDisconnect,
    scheduler,
    onSettled: refreshStatus,
  }),
};

function useGatewayEnvironment(target: EnvironmentId | null | undefined): EnvironmentId | null {
  const primary = usePrimaryEnvironment();
  const environmentId = target === undefined ? (primary?.environmentId ?? null) : target;
  const canRead = useEnvironmentScope(environmentId, AuthOrchestrationReadScope);
  return canRead ? environmentId : null;
}

/** The environment the Gateway is set up on (the primary one unless named) and its status. */
export function useLibraosGateway(target?: EnvironmentId | null) {
  const environmentId = useGatewayEnvironment(target);
  const query = useEnvironmentQuery(
    environmentId === null ? null : status({ environmentId, input: {} }),
    useMessages(),
  );
  return { environmentId, ...query };
}

/**
 * Whether agentd can price a `$` budget here: the Gateway is connected on this environment.
 * @public for the Hand to a worker dialog (#78).
 */
export function useLibraosGatewayConnected(target?: EnvironmentId | null): boolean {
  return useLibraosGateway(target).data?.connected === true;
}

export function useLibraosGatewayCommands(environmentId: EnvironmentId | null) {
  const canChange = useAtomValue(
    libraosGatewayEnvironment.connect.permissionAtom(environmentId ?? null),
  );
  // The panel says what failed itself, beside the key field.
  const options = { reportFailure: false } as const;
  return {
    canChange,
    connect: useAtomCommand(libraosGatewayEnvironment.connect, options),
    disconnect: useAtomCommand(libraosGatewayEnvironment.disconnect, options),
  };
}
