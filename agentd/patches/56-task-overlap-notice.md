# 56: Show task overlap before starting

- `apps/web/src/components/agentd/StartTaskDialog.tsx`: adds the advisory notice to the shared form and chat-draft review.
- `apps/web/src/components/agentd/StartTaskDialog.browser.test.tsx`: verifies the notice shows the person, work and path without blocking Start.
- `apps/web/src/lib/agentdState.ts`: adds the environment-scoped overlap read at the end of the agentd hooks.
- `apps/server/src/agentd/AgentdBridge.ts`: adds the bounded, best-effort overlap read at the end of the bridge methods.
- `apps/server/src/agentd/AgentdBridge.test.ts`: checks merged holdings, identity and terminal-state filtering, and silent fallback.
- `apps/server/src/ws.ts`: appends the overlap handler to the agentd handler list.
- `apps/server/src/auth/RpcAuthorization.ts`: appends the overlap read scope to the agentd scopes.
- `apps/server/src/observability/RpcInstrumentation.ts`: appends the overlap method to the agentd instrumentation list.
- `packages/contracts/src/agentd.ts`: appends the overlap RPC shapes and the active-holder fields read from `who`.
- `packages/contracts/src/rpc.ts`: appends the overlap RPC to the agentd entries.
- `packages/client-runtime/src/state/agentd.ts`: appends the overlap query to the agentd atoms, without persistent caching.

The lookup passes the checkout path unchanged to agentd through the existing platform-aware resolver and process wrapper. The bridge test uses a Windows drive path; native Windows execution was not verified. Translation catalogs are left for the wave’s shared regeneration.
