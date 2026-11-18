# 18 — Session background tasks

- `apps/web/src/components/chat/ThreadDetailsBackgroundTasks.tsx` — show repository-matched agentd tasks and the session's pending commands, confirm agentd stops, and open the Background tasks pane.
- `apps/web/src/components/chat/threadDetailsItems.ts` — register Background tasks after Outputs and default it to visible.
- `apps/web/src/components/chat/ThreadDetailsPanel.tsx` — pass the active project's repository identity to its sections.
- `apps/web/src/components/chat/ThreadDetailsPanel.browser.test.tsx` — cover repository isolation, the five-row limit, missing agentd, confirmation, and pane navigation.
- `PR-BODY.md` — record the scope blockers for full session attribution, Chat-mode access, and stopping provider commands.

Windows and Linux share the same web and desktop renderer. This patch compares repository identities rather than filesystem paths, uses the existing bridge for all agentd actions, and starts no processes. The browser fixture uses a Windows-shaped workspace path; native Windows was not available. Mobile is unchanged. Catalog regeneration is deferred to the designated translation task.
