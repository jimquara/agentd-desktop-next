# Background tasks panel registration

- `apps/web/src/rightPanelStore.ts` — register the thread-scoped singleton without changing the storage version.
- `apps/web/src/closedViewStore.ts` — recognize the singleton when reading migrated closed tabs.
- `apps/web/src/reopenClosedView.ts` — reopen the tab through the singleton store path.
- `apps/web/src/reopenClosedView.test.ts` — cover opening once, closing, restoring saved history, reopening, and reloading at the store boundary.
- `apps/web/src/components/RightPanelTabs.tsx` — add the tab label and icon and offer it in both launchers without a shortcut.
- `apps/web/src/components/RightPanelTabs.browser.test.tsx` — exercise both launcher entries and opening the placeholder by clicking the add menu.
- `apps/web/src/components/chat/RightPanelSurfaceContent.tsx` — route Background tasks to the thread-scoped placeholder.
- `apps/web/src/components/agentd/BackgroundTasksPane.tsx` — add the new placeholder with translated empty-state copy.
- `apps/web/src/components/chat/useRightPanelActions.ts` — export the opener beside the hook and reuse it for launch and activation without editing the shared hook return block.
- `apps/web/src/components/ChatView.tsx` — offer the launcher action in a thread's panel.
- `apps/web/src/components/issue/IssuesPage.tsx` — leave the issue list's shared panel without the thread-scoped action.
- `apps/web/src/components/pullRequest/PullRequestsPage.tsx` — leave the pull-request list's shared panel without the thread-scoped action.

The web and desktop renderer uses the same thread-scoped tab state on Windows and Linux. The patch adds no filesystem paths, executable lookups, or process launches. Browser verification ran on Linux; a native Windows client was not available to test.
