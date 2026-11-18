# Tests that still asserted upstream's names or hosted app

- `evals/mcp-tool-use/run.test.ts`: expects the `## AgentD Desktop devices` heading the prompt now has.
- `apps/desktop/src/window/DesktopWindow.test.ts`, `apps/web/src/components/desktop/DesktopWebLinkCoordinator.browser.test.tsx`: use the `agentd-desktop(-dev)://` scheme (#66).
- `apps/desktop/src/app/CodexAuthCallback.test.ts`: returns to a loopback web client; this build has no hosted app, so `app.t3.codes` is refused.
- `apps/mobile/src/lib/composerContextClipboard.test.ts`: pastes a `t3-thread://` link; hosted `app.t3.codes` thread links are not recognized without a hosted app.
- `apps/mobile/src/features/settings/environmentUpdateCheck.test.ts`: removed. It tested the timeout and abort of the release fetch, and this build's `findEnvironmentUpdate` fetches nothing ("Updates are not configured for this build.").
- `.github/workflows/ci.yml` (ours): the unit test job frees unused preinstalled SDKs first and has 75 minutes; the server tests filled the runner's disk and the job hit its 45-minute limit.
