# Chat and Code Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-session Chat / Code switch with app-level Chat and Code sidebar tabs: scratch threads are chats with the conversation only, every other thread is a Code session with its panels.

**Architecture:** A thread's tab is derived from its project (`isScratchProject`), never stored. A small persisted store holds only the selected tab and the last thread opened in each tab. `ChatView` gates code surfaces on the project instead of the mode store; the sidebar filters its list by the selected tab and follows the route.

**Tech Stack:** React, zustand (persist), TanStack Router, gt-react, vite-plus browser tests.

**Spec:** `docs/superpowers/specs/2026-11-19-chat-code-tabs-design.md`

## Global Constraints

- Windows, Linux and macOS share this web UI; remote hosts use the same rule, with each environment's `scratchWorkspaceRoot`.
- Folder workspaces are Code sessions; nothing assumes a git worktree.
- The native mobile app (`apps/mobile`) is unchanged.
- Follow `docs/STYLEGUIDE.md`; the tab control uses the existing `ToggleGroup` (as `ChatCodeSwitch` does today).
- No moving a chat into a project.
- Tests only where AGENTS.md allows: each new test fails if its change is reverted; tests of the removed per-session mode are deleted, not updated.
- Run `vp run check:changed` before any push; i18n: `vp run i18n:generate` in apps/web, `node scripts/i18n-check.ts` from the root, zh strings filled.

## Review Focus

1. A route opened from outside the sidebar (command palette, notification, AgentD panel) to a thread of the other tab: the tab switches and the row is visible. Pinned by Task 3's route test.
2. A thread whose project has not loaded yet: it must not flash in Chat then jump to Code; until its project is known it stays in Code (the default). Pinned by Task 3.
3. A remote environment with its own `scratchWorkspaceRoot`: its scratch threads are chats too. `sidebarTabForProject` takes the root per environment; Task 1 test covers a project matched only by root.
4. An AgentD task started from a chat: its Background tasks panel must still open, since Chat hides every other panel. Ruling in Task 2.
5. The remembered thread of a tab was deleted or archived: clicking the tab must not navigate to a dead route; it falls back as when nothing is remembered. Pinned by Task 3.

---

### Task 1: Tab model

**Files:**

- Create: `apps/web/src/sidebarTabStore.ts`
- Test: `apps/web/src/sidebarTabStore.test.ts`

**Interfaces:**

- Produces:
  - `type SidebarTab = "chat" | "code"`
  - `sidebarTabForProject(project: { workspaceRoot: string; isScratch?: true } | null, scratchWorkspaceRoot: string | null | undefined): SidebarTab` — `"chat"` only when the project is known and `isScratchProject` says so; `null` → `"code"`.
  - `useSidebarTab(): SidebarTab` (default `"code"`), `setSidebarTab(tab: SidebarTab): void`
  - `rememberSidebarTabThread(tab: SidebarTab, ref: ScopedThreadRef): void`, `lastSidebarTabThread(tab: SidebarTab): ScopedThreadRef | null`
  - Persisted with zustand `persist` under `"t3code:sidebar-tab:v1"`, using `resolveStorage` as `chatCodeModeStore.ts` does.

- [ ] **Step 1: Write the failing test** `sidebarTabForProject`: `{workspaceRoot:"/s", isScratch:true}` with root `null` → `"chat"`; `{workspaceRoot:"/home/a/scratch"}` with root `"/home/a/scratch"` → `"chat"`; `{workspaceRoot:"/projects/x"}` with root `"/home/a/scratch"` → `"code"`; `null` → `"code"`.
- [ ] **Step 2: Run** `vp test run src/sidebarTabStore.test.ts` in apps/web. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the file above.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `Sidebar tabs: a thread's tab comes from its project`.

### Task 2: ChatView shows code surfaces for Code sessions only

**Files:**

- Modify: `apps/web/src/components/ChatView.tsx` (`chatCodeMode`/`showCodeSurfaces` near line 1038; `activeProjectIsScratch` near line 1232; `terminal.toggle` near line 2795)
- Modify: `apps/web/src/components/chat/useRightPanelActions.ts:318-350`
- Test: `apps/web/src/components/ChatView.browser.test.tsx`

**Interfaces:**

- Consumes: `sidebarTabForProject` (Task 1).
- Produces: `showCodeSurfaces = !embedded && sidebarTabForProject(activeProject, scratchRoot) === "code"`; move the computation of `activeProject`/scratch root above its first use.

Ruling: in a chat the right panel may still show the `"background-tasks"` surface (AgentD activity), opened only by its entry points; no title-bar control, terminal, diff, preview or files. Why: tasks started from a chat (#47) must stay visible. Cost if wrong: one condition to remove.

- [ ] **Step 1: Write the failing test** "a chat shows the conversation only, a project session shows its panels": render a scratch-project thread → no `Terminal` / right-panel title-bar buttons, and `terminal.toggle` / `diff.toggle` shortcuts do not open anything; render a project thread → both buttons present without any mode switch. Delete the test "switching modes preserves a details popover beside an open workspace panel" (line 675).
- [ ] **Step 2: Run** `vp test run --project browser src/components/ChatView.browser.test.tsx -t "a chat shows"`. Expected: FAIL (project thread hides the buttons by default today).
- [ ] **Step 3: Implement**: replace `useChatCodeMode` with the project rule; in the shortcuts drop the `revealCodeMode` calls (a Code session already shows the surfaces; in a chat return `false`); `rightPanelOpen`/`rightPanelPresent` allow `activeRightPanelSurface === "background-tasks"` when not `showCodeSurfaces`.
- [ ] **Step 4: Run** the whole `ChatView.browser.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `ChatView: code panels follow the project, chats show the conversation`.

### Task 3: Sidebar Chat and Code tabs

**Files:**

- Create: `apps/web/src/components/sidebar/SidebarTabSwitch.tsx` (replaces `ChatCodeSwitch.tsx`, same `ToggleGroup`, labels "Chat" / "Code", aria-label "Sidebar tab", no longer disabled without a thread)
- Delete: `apps/web/src/components/sidebar/ChatCodeSwitch.tsx`
- Modify: `apps/web/src/components/Sidebar.tsx` (`listedThreads` ~1114, mount at ~2995, header props)
- Modify: `apps/web/src/components/sidebar/SidebarThreadHeader.tsx` (`newThreadLabel`)
- Test: `apps/web/src/components/Sidebar.browser.test.tsx`

**Interfaces:**

- Consumes: Task 1 store and `sidebarTabForProject`; `useScratchProject().startScratchThread`, `scratchEnvironmentId`.
- Produces: `SidebarThreadHeader` prop `tab: SidebarTab`.

Behaviour:

- `listedThreads` keeps only threads whose project (by `environmentId:projectId`, root from `serverConfigs`) gives the selected tab; an unknown project counts as Code.
- Chat tab: no project scope combobox, no folders (`folderGroups: null`), `scopedProjectKeys: null`; header button reads "New chat" and calls `startScratchThread(scratchEnvironmentId(primaryEnvironmentId))`, disabled when that is `null`.
- Code tab: today's sidebar unchanged.
- When the route thread changes: `rememberSidebarTabThread(tabOfRouteThread, ref)` and, if it differs from the selected tab, `setSidebarTab(tabOfRouteThread)`.
- Clicking a tab: navigate to `lastSidebarTabThread(tab)` if that thread is still listed (not archived or deleted); otherwise Chat → start a scratch chat, Code → `handleNewThread(defaultProjectRef)` when there is one, else navigate to `/`.

- [ ] **Step 1: Write the failing tests**
  - "lists chats under Chat and project sessions under Code": one scratch-project thread "Scratch chat" and one project thread "Thread 1"; Code shows only "Thread 1"; click tab "Chat" → only "Scratch chat", and no "All projects" scope button.
  - "follows the route to the tab of the open thread": route target = the scratch thread → tab "Chat" is pressed and "Scratch chat" is visible.
  - "a thread whose project is unknown stays under Code".
  - "a remembered chat that was archived is not reopened": remember the scratch thread, mark it archived, click "Chat" → the scratch-start mock is called and no navigation to the archived thread.
- [ ] **Step 2: Run** `vp test run --project browser src/components/Sidebar.browser.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the behaviour above.
- [ ] **Step 4: Run** the same file. Expected: all PASS.
- [ ] **Step 5: Commit** `Sidebar: Chat and Code tabs, as in the Claude desktop app`.

### Task 4: Remove the per-session mode

**Files:**

- Delete: `apps/web/src/chatCodeModeStore.ts`, `apps/web/src/chatCodeModeStore.test.ts`
- Modify: `apps/web/src/components/agentd/AgentdPage.tsx:86`, `apps/web/src/components/agentd/StartTaskDialog.tsx:286`, `apps/web/src/components/chat/ThreadDetailsAgentdWorkers.tsx:66`, `apps/web/src/components/chat/ThreadDetailsBackgroundTasks.tsx:162` — drop `revealCodeMode`; navigation alone selects the tab (Task 3).
- Modify tests: `StartTaskDialog.browser.test.tsx` (remove `setChatCodeMode`, `ParentCodeMode` and its assertions), `ThreadDetailsPanel.browser.test.tsx` (remove `ModeProbe` and the "Session mode" assertions; keep the panel assertions).
- Create: `agentd/patches/81-chat-code-tabs.md` (what changed per file, platforms, what was not verified); Delete: `agentd/patches/8-chat-code-switch.md`.
- i18n: regenerate catalogs, fill zh for "Sidebar tab", "New chat", "Chat", "Code"; drop the removed "Session view" strings.

- [ ] **Step 1: Run** `grep -rn "chatCodeMode\|revealCodeMode\|ChatCodeSwitch" apps/web/src` after the edits. Expected: no output.
- [ ] **Step 2: Run** `vp run --filter @t3tools/web typecheck`, the two edited browser test files, `node scripts/i18n-check.ts`. Expected: all pass.
- [ ] **Step 3: Run** `vp run check:changed`. Expected: pass.
- [ ] **Step 4: Commit** `Remove the per-session Chat / Code switch`.

### Task 5: See it

- [ ] Screenshot both tabs with a temporary browser test (`page.screenshot({ path: "shots/chat-tab.png" })`, relative path), Chat with a scratch chat open and Code with a project session and terminal open; move the shots to the scratchpad, delete the temporary test, and send the shots to the user.
