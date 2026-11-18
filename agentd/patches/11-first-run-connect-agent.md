# 11 — Connect an agent on first run

- `apps/web/src/branding.ts` — Drop the unused phone-store URL now that Welcome no longer links to it.
- `apps/web/src/components/onboarding/WelcomePage.tsx` — Center the three live agent rows, keep other agents behind More agents, reuse the setup terminal, and remove phone and hosted sign-in controls.
- `apps/web/src/components/onboarding/ConnectEndpointScreen.tsx` — Add the API key or gateway placeholder with Back navigation.
- `apps/web/src/components/onboarding/JoinTeamScreen.tsx` — Add the team placeholder with Back navigation.
- `apps/web/src/components/onboarding/WelcomePage.import.browser.test.tsx` — Cover row ordering, readiness, terminal progression, secondary screens, and retained project import behavior.
- `apps/web/src/onboarding/welcomePage.logic.ts` — Pin the three default instances ahead of other agents and remove logic for dropped onboarding controls.
- `apps/web/src/onboarding/welcomePage.logic.test.ts` — Remove cases for the phone and managed Codex controls no longer in Welcome.
- `apps/web/src/onboarding/providerReadiness.logic.ts` — Recognize opencode's sign-in state and resolve its install and login commands for the host terminal.
- `apps/web/src/onboarding/providerReadiness.logic.test.ts` — Cover opencode readiness, install commands, and shell quoting for configured binary paths.
- `apps/web/src/routes/welcome.tsx` — Validate the placeholder screen search value without changing welcome authentication or environment routing.
- `packages/contracts/src/settings.ts` — Make only the unconfigured default opencode instance active so clients see the same readiness as the host and can use it after onboarding.
- `apps/server/src/provider/ProviderInstanceRegistryHydration.ts` — Apply that default to unsaved instances; a disabled driver otherwise never reports installation or sign-in status, and explicit settings still take priority.
- `apps/server/src/provider/ProviderInstanceRegistryHydration.test.ts` — Guard fresh default detection and explicit opt-out across registry hydration and client eligibility.
- `docs/user/welcome-page.md` — Describe the new Welcome flow and the npm prerequisite for installing opencode from it.

On Windows the setup terminal runs `npm.cmd` and uses the existing PowerShell quoting for configured paths, including paths with spaces. On Linux it uses `npm` and the existing POSIX path quoting. Both use the existing provider and terminal executors; there is no new subprocess or path lookup. Windows command construction is tested; a native Windows run was not available.
