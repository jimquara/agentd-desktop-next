The desktop bundle builds, and the Linux/Windows icon inputs and packaging configuration are verified. Final installer smoke tests need a build host with Rust and the target toolchain; Linux packaging also needs libsecret development headers, pkg-config, and ImageMagick. This worker does not expose Browser-panel tools, so the sidebar wordmark was verified with the rendered component and the title and icons with the isolated dev server.

## Team enrollment (#20)

Adds team enrollment from first run and Settings. The app previews the server, clears the pasted link when submitted, and shows the joined person or the AgentD refusal.

Two CLI limits remain: AgentD reports the joined server address and person, but no separate team display name; and it only accepts unencrypted enrollment over loopback, not a private LAN. The screen shows the server host in place of a display name and requires HTTPS off loopback. Dashboard sign-in invitations do not contain device tickets and cannot be used with this enrollment command.
