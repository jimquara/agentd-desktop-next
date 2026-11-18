# 16: Offer Claude Code, Codex, and OpenCode by default

Other agents stay installed and may run existing threads. On web and desktop, **Settings → Providers → Show other agents** restores discovery for the selected environment. A managed `providers.allowedDrivers` list replaces that discovery preference and still restricts execution.

The ACP catalog has no implicit instance and its HTTP fetch is lazy. Fresh profiles don't subscribe to registry search or pass the server's discovery gate. Turning off discovery doesn't interfere with explicitly configured ACP agents resolving their packages for existing threads.

Windows and Linux use the same driver IDs, settings schema, and UI. No path handling, executable lookup, or process launch was changed. Verification ran on Linux; Windows was not run.

## Upstream files

- `apps/server/src/policy/ManagedPolicy.test.ts` — verifies the default list, policy precedence, runtime compatibility, and suppressed registry calls.
- `apps/server/src/policy/managedProviders.ts` — checks agent discovery before running an ACP catalog search or prepare operation.
- `apps/server/src/ws.ts` — routes ACP catalog discovery and preparation through the policy guard; existing-session operations are unchanged.
- `apps/web/src/components/chat/ModelPickerContent.tsx` — filters discovery by environment and keeps the active provider in threads locked to a hidden agent.
- `apps/web/src/components/chat/ProviderModelPicker.browser.test.tsx` — exercises the picker defaults, opt-in, managed list, and an existing thread's agent name.
- `apps/web/src/components/settings/AddProviderInstanceDialog.environment.browser.test.tsx` — exercises offered drivers before and after opt-in and under a managed allow-list.
- `apps/web/src/components/settings/AddProviderInstanceDialog.tsx` — filters driver options and subscribes to ACP search only while allowed and visible.
- `apps/web/src/components/settings/ProviderSettingsPanel.environment.browser.test.tsx` — verifies the environment setting changes which provider slots are offered.
- `apps/web/src/components/settings/ProviderSettingsPanel.tsx` — adds the environment preference and filters provider slots without breaking links to existing instances.
- `packages/contracts/src/managedPolicy.ts` — shares the built-in discovery default and policy precedence between client and server, separately from execution rules.
- `packages/contracts/src/settings.ts` — adds the default-off server preference and allows it through the settings patch schema so it can be saved remotely.
