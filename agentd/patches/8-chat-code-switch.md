# 8 — Chat / Code switch

- `apps/web/src/chatCodeModeStore.ts` — persists Code opt-ins per environment and thread; Chat is the default.
- `apps/web/src/components/sidebar/ChatCodeSwitch.tsx` — adds the translated segmented control, disabled when no session is selected.
- `apps/web/src/components/Sidebar.tsx` — mounts the control below the header with the selected draft or saved session's key.
- `apps/web/src/components/ChatView.tsx` — hides Code surfaces without closing them, restores the conversation if the panel was maximized, and reveals the drawer via its existing shortcut.
- `apps/web/src/components/chat/ThreadDetailsCard.tsx` — keeps the details popover open across the switch's outside press and transient measurements on remount.
- `apps/web/src/components/chat/useRightPanelActions.ts` — reveals Code for the right-panel and diff shortcuts before acting.
- `apps/web/src/chatCodeModeStore.test.ts` — checks reload persistence and isolation for identical thread IDs in different environments.
- `apps/web/src/components/ChatView.browser.test.tsx` — covers the mode round trip and workspace shortcuts; updates the side-chat fixture to open Code first.

Windows and Linux share the same web/Electron UI, scoped identifiers, browser storage, and existing shortcut resolution. There are no new filesystem paths or subprocesses. Chromium verification ran on Linux; native Windows was not available. Mobile native is unchanged. Catalog regeneration is deferred to the designated translation task.
