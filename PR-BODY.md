The desktop bundle builds, and the Linux/Windows icon inputs and packaging configuration are verified. Final installer smoke tests need a build host with Rust and the target toolchain; Linux packaging also needs libsecret development headers, pkg-config, and ImageMagick. This worker does not expose Browser-panel tools, so the sidebar wordmark was verified with the rendered component and the title and icons with the isolated dev server.

## #18 — Background tasks scope blockers

- The merged agentd bridge exposes a repository slug, but not the task working directory or originating session. The section can match GitHub repositories, but cannot attribute otherwise unlinked tasks to this session or a local directory. The detail timestamp is task creation time, not worker start time.
- Chat mode hides both the session panel and its launcher in `ChatView.tsx`, which #18 explicitly does not own. The section's click handlers reveal Code and open the pane, but are not reachable from Chat mode in the full app.
- Provider background commands appear in the list, but the app only has a session-wide interrupt, not a command-specific Stop. The section does not use a broad interrupt for an individual row.
