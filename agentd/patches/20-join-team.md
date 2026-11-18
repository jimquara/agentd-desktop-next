# 20 — Join a team on first run

- `apps/web/src/components/onboarding/JoinTeamScreen.tsx` — Preview the invitation server and join through the existing AgentD bridge without retaining the ticket.
- `apps/web/src/components/settings/SettingsSidebarNav.tsx` — Link Settings directly to the team invitation screen.

Web and desktop use the same screen and existing platform-neutral bridge. No new executable, process launcher, or filesystem paths are introduced. Verified on Linux; native Windows verification was not available.

The installed enrollment command reports the server address and person, not a separate team display name. It permits plain HTTP only on loopback. Dashboard sign-in invitations are not device enrollment tickets.
