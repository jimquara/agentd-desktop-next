# 21: Start a task from chat

- `apps/web/src/components/CommandPalette.tsx`: hosts the shared dialog and adds the active session’s palette action.
- `apps/web/src/components/CommandPalette.composition.browser.test.tsx`: leaves the unrelated dialog out of palette tests that stub all atom reads.
- `apps/web/src/components/chat/ChatComposer.tsx`: opens the dialog from the composer command menu without sending or overwriting the prompt.
- `apps/web/src/components/chat/useComposerMenuItems.ts`: lists the handoff action for sessions allowed to start tasks.
- `apps/web/src/composer-logic.ts`: recognizes the new composer command in the menu’s command type.

The existing AgentD bridge and status contract read `dispatch.default_tool` through the shared process runner. The dialog passes through the session’s environment-local project or worktree path, including drive and UNC paths, and checks the branch through the existing local Git status RPC. No Windows runtime was available; verify the workflow on Windows before release.
