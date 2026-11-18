# 53: Start a task in Cloud Workers

Cloud offers use `agentd-new`, the fallback session the local `agentd new` command uses. The bridge joins that session without creating a local task. The cloud offer uses the checkout’s GitHub `origin`, even for a fork. It does not pass a local worker, checkout, or issue to the hosted job.

Budget defaults are used when agentd includes them in its response; v0.1.13 has no cloud budget defaults in its configuration schema. The provider key inputs accept only absolute paths on the selected environment. AgentD Desktop never opens the files, and agentd handles their validity and billing. No preference for a local provider is sent to Cloud Workers.

Windows uses the existing process runner and resolver, including their Windows executable handling; paths use the selected host’s absolute-path check, not a POSIX-only path test. The Linux checks use the same argv construction. A native Windows run was not verified in this worktree.

- `apps/server/src/agentd/AgentdBridge.ts` — Append cloud setup and route the cloud form of Start to the cloud service.
- `apps/server/src/agentd/AgentdBridge.test.ts` — Verify version-specific capability, fork origin, budget, offer receipts and path-only argv with a stub agentd.
- `apps/server/src/agentd/agentdCloud.ts` — Resolve capability and origin, read balance, submit offers and map cloud refusals to safe messages.
- `apps/server/src/agentd/agentdCommands.ts` — Append fixed argument lists for cloud commands.
- `apps/server/src/agentd/agentdJson.ts` — Project agentd’s cloud state, model access, costs and safe refusal notes into task reads.
- `apps/server/src/auth/RpcAuthorization.ts` — Append the existing orchestration read scope for the setup read; Start and Stop retain their operate scope.
- `apps/server/src/observability/RpcInstrumentation.ts` — Append the setup read to the AgentD telemetry group.
- `apps/server/src/ws.ts` — Append the thin cloud setup RPC handler.
- `apps/web/src/components/agentd/AgentdBackgroundTaskRow.tsx` — Show cloud state, billing and branch and share the summary and Stop with the AgentD page.
- `apps/web/src/components/agentd/AgentdPageWorkers.tsx` — Show cloud task details and Stop in the existing Cloud Workers section.
- `apps/web/src/components/agentd/BackgroundTasksPane.browser.test.tsx` — Check that finished cloud work shows the reported costs and explains BYOK billing.
- `apps/web/src/components/agentd/StartTaskCloud.tsx` — Provide cloud-specific options and validation without passing credential contents.
- `apps/web/src/components/agentd/StartTaskDialog.browser.test.tsx` — Verify cloud availability, validation and submission alongside local start.
- `apps/web/src/components/agentd/StartTaskDialog.tsx` — Use the cloud fields in the same form for manual and conversation-drafted tasks.
- `apps/web/src/lib/agentdState.ts` — Append the environment-specific cloud setup hook.
- `packages/client-runtime/src/state/agentd.ts` — Append the cloud setup read to the AgentD query atoms.
- `packages/contracts/src/agentd.ts` — Append cloud settings and wire fields without exposing credentials or raw task bodies.
- `packages/contracts/src/rpc.ts` — Append the cloud setup RPC and accept the cloud input on the existing Start RPC.
