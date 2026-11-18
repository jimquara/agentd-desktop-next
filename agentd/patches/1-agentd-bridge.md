# 1: agentd bridge

The server runs agentd with fixed argument lists and serves its tasks, output, status and commands as `agentd.*` RPC methods.

New files (not upstream): `packages/contracts/src/agentd.ts`, `apps/server/src/agentd/`, `packages/client-runtime/src/state/agentd.ts`, `apps/web/src/lib/agentdState.ts`.

Upstream files changed:

- `packages/contracts/src/index.ts`: re-export `agentd.ts`.
- `packages/contracts/src/rpc.ts`: the `agentd.*` method names, their RPC definitions and their entries in `WsRpcGroup`.
- `packages/contracts/src/clientRpcPermissions.ts`: scopes for the four mutating methods (start and stop a task, connect an agent, join a team).
- `apps/server/src/auth/RpcAuthorization.ts`: orchestration-read scope for the seven read methods.
- `apps/server/src/observability/RpcInstrumentation.ts`: the `agentd` trace aggregate for every method.
- `apps/server/src/ws.ts`: one handler line per method, each calling `AgentdBridge`.
- `apps/server/src/server.ts`: build `AgentdBridge.layer` beside `layerResourceDiagnostics`.
- `apps/server/src/ws.test.ts`: mock `AgentdBridge` like the other services, so the RPC test layer builds (not in the task's file list; one import and one line).
- `packages/client-runtime/src/rpc/client.ts`: the two `agentd` streams in the subscription tag list.
- `packages/client-runtime/package.json`: export `./state/agentd` (not in the task's file list; four lines, like every other state module).
- `apps/web/src/lib/backgroundActivityReporter.ts`, `apps/mobile/src/connection/background-activity-scopes.ts`: a visible client watching the task list reports the `diagnostics` scope, so the server re-reads agentd only while someone looks.
- `knip.jsonc`: `apps/web/src/lib/agentdState.ts` as an entry until the agentd screens import it (not in the task's file list; drop the line when they do).
