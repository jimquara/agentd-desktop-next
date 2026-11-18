# 54: Work for the team

This environment as an opt-in team node. The server runs one `agentd worker --kind desktop --accept-server-work --max 1 --active-window 10m --tools T --repo DIR --command CMD --push` child while the person has switched it on, restarts it with backoff (5 s doubling to 5 min, reset after a 2-minute run) when it exits, and ends it when switched off or when the server stops. While the person uses the app, the client asks the server for `agentd worker foreground on --for 10m`, at most once a minute (client and server both hold it to that).

Upstream files changed:

- `packages/contracts/src/rpc.ts`: three RPCs at the end of the agentd list (subscribe to the node, set it, foreground).
- `packages/contracts/src/clientRpcPermissions.ts`: setting the node needs maintain scope, as joining a team does.
- `packages/client-runtime/src/rpc/client.ts`: the node subscription in the subscription tag list.
- `apps/server/src/auth/RpcAuthorization.ts`: read scope for the node subscription and the busy signal.
- `apps/server/src/observability/RpcInstrumentation.ts`: the three RPCs under `agentd`.
- `apps/server/src/server.ts`: provide `AgentdTeamNode` beside `AgentdBridge` in `layerAgentd`.
- `apps/server/src/ws.ts`: the three handlers, each one service call.
- `apps/server/src/ws.test.ts`: a mock for the new service, as for `AgentdBridge`.
- `apps/web/src/routes/_chat.tsx`: mount the app-wide busy signal (renders nothing).

New fork files: `apps/server/src/agentd/AgentdTeamNode.ts` (the child, its state, the busy signal), its test, and `apps/web/src/components/agentd/AgentdTeamNodeSwitch.tsx` (the switch and the busy signal).

Shared fork files, additions at the end of each list:

- `packages/contracts/src/agentd.ts`: `AgentdTeamNodeStatus` and `AgentdTeamNodeInput`.
- `apps/server/src/agentd/agentdCommands.ts`: `enrolWorker` (ticket on stdin) and `foreground`.
- `apps/server/src/agentd/AgentdBridge.ts`: `binary`, `enrolWorker`, `foreground`.
- `packages/client-runtime/src/state/agentd.ts` and `apps/web/src/lib/agentdState.ts`: the node's atoms and hook.
- `apps/web/src/components/agentd/AgentdPage.tsx` and `AgentdPageReads.tsx`: the switch under the team server in the Status section's team row, shown only once joined.

Choices:

- The choice (on, agent, folder) is kept per environment in the server's state directory (`agentd-team-node.json`), not in the browser; an "on" choice starts the worker again when the server starts.
- `agentd worker` needs a worker credential of its own (`agentd server enroll --worker`), separate from the person's join credential. The switch takes an optional worker ticket, sent to `agentd worker --server URL --ticket-file -` on stdin before the worker starts; without one, an unenrolled worker fails and the section shows agentd's message.
- State comes from the worker's own lines: `leased hof-…` is working on that task, and its end line (`delivered`, `not delivered`, `failed:`, `declined:`, `stopped:`) is waiting again. An exit is failed with agentd's last line until the restart.
- The agents offered are those installed among Claude Code, Codex and opencode (found on the server's PATH); the commands are the Orca app's `NODE_COMMANDS`, the same shape for each.

Windows: agentd and the agents are found with the existing resolver (`.exe`/`.cmd`), the child is spawned through `resolveSpawnCommand` and Effect's spawner (no `sh -c`), paths come from `path.join`, and stopping closes the child's scope, which ends only the process the server started (its group on POSIX). Not verified on Windows: agentd runs `--command` with `sh`, so a Windows node needs agentd's own Windows handling of that command; the process-tree end on Windows is Effect's.
