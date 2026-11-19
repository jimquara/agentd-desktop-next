# 81 — Chat and Code tabs

Replaces `8-chat-code-switch.md`. The sidebar has app-level Chat and Code tabs instead of a per-session switch: a thread's tab comes from its project (a scratch project is a chat, every other project a Code session), so nothing is stored per thread and nothing migrates. The `t3code:chat-code-mode:v1` key is no longer read.

- `apps/web/src/sidebarTabStore.ts` — new: `sidebarTabForProject` (unknown project → Code), the selected tab and the thread last open in each tab, persisted as `t3code:sidebar-tab:v1`.
- `apps/web/src/sidebarTabStore.test.ts` — new: scratch by flag or by the environment's scratch root, other and unknown projects under Code.
- `apps/web/src/chatCodeModeStore.ts`, `apps/web/src/chatCodeModeStore.test.ts` — removed with the per-session mode.
- `apps/web/src/components/sidebar/SidebarTabSwitch.tsx` — new: the Chat / Code `ToggleGroup`, replacing `ChatCodeSwitch.tsx` (removed).
- `apps/web/src/components/sidebar/SidebarThreadHeader.tsx` — `tab` prop: Chat hides the project scope and Add project, and its new button reads "New chat".
- `apps/web/src/components/Sidebar.tsx` — mounts the tabs; lists only the selected tab's threads and drafts; Chat has no project scope or folders; follows the route to its thread's tab and remembers it; a tab click reopens its remembered thread if still listed, else starts a scratch chat (Chat) or a session in a Code project (Code).
- `apps/web/src/components/ChatView.tsx` — code surfaces follow the project, not a stored mode; a chat keeps only the AgentD background-tasks surface, and its terminal, right-panel, diff and thread-panel shortcuts do nothing.
- `apps/web/src/components/chat/useRightPanelActions.ts` — drops the reveal-before-acting from the right-panel and diff shortcuts; they are upstream's again.
- `apps/web/src/components/chat/ThreadDetailsCard.tsx` — drops the switch from the outside-press exception; the line is upstream's again. The remount guard from #8 stays.
- `apps/web/src/components/agentd/AgentdPage.tsx`, `agentd/StartTaskDialog.tsx`, `chat/ThreadDetailsAgentdWorkers.tsx`, `chat/ThreadDetailsBackgroundTasks.tsx` — no longer reveal Code before opening Background tasks; navigation selects the tab.
- `apps/web/test/fakeEnvironment.ts` — a fixture thread may name its project, and the server config a scratch root.
- `apps/web/src/components/ChatView.browser.test.tsx` — the mode tests are replaced by one: a chat shows the conversation and Background tasks only, a project session its panels.
- `apps/web/src/components/Sidebar.browser.test.tsx` — tab listing, following the route, unknown project under Code, an archived remembered chat not reopened.
- `apps/web/src/components/agentd/StartTaskDialog.browser.test.tsx`, `chat/ThreadDetailsPanel.browser.test.tsx` — drop the mode assertions; the panel assertions stay.
- `apps/web/src/i18n/translations/*.json` — regenerated: "Sidebar tab", "Chat", "Code", "New chat" added (zh filled), "Session view" removed.

Windows, macOS and Linux share this web/Electron UI; the rule uses each environment's own `scratchWorkspaceRoot`, so remote hosts follow it too. No filesystem paths or processes are added. Verified in Chromium on Linux only: native Windows and macOS builds were not run, and remote environments were checked only through unit and browser tests. The native mobile app is unchanged.
