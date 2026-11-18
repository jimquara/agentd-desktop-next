# 22: AgentD page

Upstream files changed:

- `apps/web/src/routeTree.gen.ts` — regenerate the route tree with `/agentd`.
- `apps/web/src/components/sidebar/mainAppLocation.ts` — treat AgentD like the Usage modal and preserve its return location.
- `apps/web/src/components/sidebar/SidebarChrome.tsx` — add AgentD to the sidebar footer.
- `apps/web/src/components/CommandPalette.tsx` — add the searchable Open AgentD action.

New fork files: `apps/web/src/routes/_chat.agentd.tsx` and the `AgentdPage*` files under `apps/web/src/components/agentd/`.

Fork files needed beyond the page's normal ownership:

- `packages/contracts/src/agentd.ts` — let the existing RPCs carry server identity, task and requester names, and node cards.
- `apps/server/src/agentd/agentdCommands.ts` — add the fixed `agentd server nodes --json` read.
- `apps/server/src/agentd/AgentdBridge.ts` — include node cards only when the caller asks for them.
- `apps/server/src/agentd/agentdJson.ts` — retain agentd's task and request identities and interpret doctor's server check without reading enrollment files.
- `apps/server/src/agentd/AgentdBridge.test.ts` — verify the added metadata against hand-written CLI responses.
- `apps/web/src/lib/agentdState.ts` — let the page request node cards via the existing permission-scoped people query.

The page never answers an approval itself: the bridge has no approval mutation, so the page shows agentd's approve and reject commands. The Join link opens the shared team invitation screen. A task opens Background tasks in an existing session on the same environment; with no session the page shows the task's details without creating a session. The selected-row hash must be consumed by the pane in #17.

Worker data covers the task list and node cards on the environment's agentd ledger. An enrolled client is not given a fleet-wide task list by these commands if the team uses a separate server ledger. Cloud work uses the task state agentd reports and does not invent a cloud machine name.

Windows and Linux use the same renderer and bridge. The new CLI read uses the existing executable resolver and argument-list process runner; there are no new shell invocations or platform-specific paths. The install guidance applies to the host environment. Native Windows was not verified here.
