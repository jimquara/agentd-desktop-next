# Chat and Code as two places

## Why

Today Chat / Code is a switch on each session: Code shows the terminal, diff,
preview and files panels next to the conversation, and Chat hides them. People
switch to Code, see the same conversation, and cannot tell what changed. The
Claude desktop app splits the two at the app level: a Chat tab for
conversations without a project, and a Code tab where each session belongs to
a project folder and has panes beside the chat. We follow that split.

## Approaches

- **A. Two places, as in Claude (chosen).** The sidebar gets app-level Chat and
  Code tabs, each with its own list. A conversation belongs to one of them.
  Clearest, closest to Claude; touches the sidebar list and the new-thread
  entry points.
- B. Keep the per-session switch and only make Code look like Claude's Code
  tab (panes open by default, pane buttons in the title bar). Smaller, but the
  same conversation still has two looks, which is the confusion we are fixing.

## Design

- **Tabs.** A Chat / Code tab control at the top of the sidebar replaces the
  per-session `ChatCodeSwitch`. Each tab remembers the conversation last open
  in it. The app opens on Code.
- **Chat tab.** Lists scratch-project threads (`isScratchProject`). "New chat"
  starts a scratch thread (`useScratchProject().startScratchThread`). A chat
  shows the conversation only: no terminal, right panel, diff, preview or
  files controls, and their shortcuts do nothing. The agent runs as today in
  the scratch folder.
- **Code tab.** Lists every non-scratch thread: today's sidebar, with project
  grouping, folders, shelves and project scope. "New session" works as today.
  A Code session always shows the code surfaces (what `showCodeSurfaces` gates
  today); the pane buttons sit in the session title bar.
- **Which tab a thread is in** comes from its project, not from stored state:
  scratch → Chat, otherwise Code. Nothing to migrate. The
  `t3code:chat-code-mode:v1` store goes away.
- **No moving.** A chat cannot be moved into a project; coding work starts a
  new session in Code, as in Claude.
- **Entry points.** Opening a thread from anywhere (routes, command palette,
  notifications, AgentD panel tasks, background tasks, workers) selects the
  tab the thread belongs to. The callers of `revealCodeMode` select the Code
  tab instead.

## Constraints

- Windows, Linux and macOS share this web UI; remote hosts use the same rule,
  with each environment's `scratchWorkspaceRoot`.
- Folder workspaces are Code sessions; nothing assumes a git worktree.
- The native mobile app has no code panels and is unchanged.
- Follow `docs/STYLEGUIDE.md` and the existing `ToggleGroup` for the tabs.

## Non-goals

- Moving a chat into a project ("Continue in Code").
- Changing how scratch threads run or are stored.
- A Cowork-style third tab.

## Left to the builder

- Where the tab state lives (UI state store or local storage) and how a route
  to a thread of the other tab switches it.
- What the Chat tab shows when there are no chats, and the Code tab when there
  are no projects (reuse `NoProjectsHero`).
- The patch note under `agentd/patches/`, replacing `8-chat-code-switch.md`.
