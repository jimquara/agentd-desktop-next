# 66: Own data folder, profile, link scheme and command

AgentD Desktop no longer shares T3 Code's identity on a machine that has both:

- **Data folder:** `<home>/.agentd-desktop` (`%USERPROFILE%\.agentd-desktop` on Windows), from the OS home directory.
  `AGENTD_DESKTOP_HOME` chooses it; `T3CODE_HOME` still works when the new one is unset or blank. Other
  `T3CODE_*` names are unchanged. `~/.t3` is not copied, moved or read.
- **Electron profile:** `agentd-desktop` (dev: `agentd-desktop-dev`). Nothing is imported from T3 Code's profiles
  (`T3 Code (Alpha)`, `T3 Code (Dev)`, `t3code`, `t3code-v2`), neither Local Storage nor Windows `Local State`.
- **Link scheme:** `agentd-desktop://` (dev: `agentd-desktop-dev://`), registered, built and parsed. Links with
  `t3code://` are T3 Code's and no longer open this app.
- **Command:** `agentd-desktop` (`agentd-desktop.cmd` on Windows) in `<data folder>/bin`, linked into `~/.local/bin`
  or `~/bin` on Linux and macOS, that folder on the user PATH on Windows. The app no longer writes, links or
  removes any `t3`.

One definition: `packages/shared/src/desktopIdentity.ts` (new, ours) holds the folder name, both variable names,
the scheme and the command name; every place below reads it instead of spelling `.t3`, `T3CODE_HOME` or `t3code`.

## Upstream files changed

- `packages/shared/package.json`: exports `./desktopIdentity`.
- `packages/shared/src/remote.ts`: pairing app links are built and recognised with our scheme.
- `packages/shared/src/promptLinks.ts`: new-thread and thread links are built and recognised with our scheme.
- `packages/shared/src/codexAuthHandoff.ts`: the Codex sign-in hand-off link uses our scheme.
- `packages/shared/src/providerAuthReturnUrl.ts`: returns only to our desktop scheme's `app` host.
- `apps/desktop/src/app/DesktopStatePaths.ts`: the default data folder comes from `defaultDesktopHome`.
- `apps/desktop/src/app/DesktopConfig.ts`: reads the home from `AGENTD_DESKTOP_HOME`, then `T3CODE_HOME`.
- `apps/desktop/src/app/DesktopEarlyElectronStartup.ts`: the pre-ready settings path uses the same variables.
- `apps/desktop/src/app/DesktopUserData.ts`: own profile names; the dev-legacy and Windows `Local State` import from T3 Code's profiles is gone.
- `apps/desktop/src/app/DesktopLegacyLocalStorage.ts`: no T3 Code profile is read for a Local Storage import.
- `apps/desktop/src/electron/ElectronProtocol.ts`: the app scheme comes from `APP_LINK_SCHEME`.
- `apps/desktop/src/app/DesktopCliShim.ts`: the launcher file is `agentd-desktop` / `agentd-desktop.cmd`.
- `apps/desktop/src/app/DesktopCliCommand.ts`: links, finds, removes and checks PATH for `agentd-desktop`, never `t3`; its messages name that command.
- `apps/desktop/src/backend/DesktopBackendConfiguration.ts`: neither home variable is passed into WSL.
- `apps/desktop/src/wsl/DesktopWslEnvironment.ts`: the WSL runtime cache lives under `~/.agentd-desktop/wsl-runtime` in the distro.
- `apps/desktop/scripts/electron-launcher.mjs`: registers our schemes and forwards `AGENTD_DESKTOP_HOME` in dev.
- `scripts/build-desktop-artifact.ts`: macOS and Linux packages register our schemes.
- `apps/server/src/os-jank.ts`: `resolveBaseDir`'s default is `defaultDesktopHome`.
- `apps/server/src/cli/config.ts`, `app.ts`, `pair.ts`, `theme.ts`, `trace.ts`, `triage.ts`: read the home through `DesktopHomeConfig`.
- `apps/server/src/cli/browser.ts`: env home and the sudo user's default home use the shared definition.
- `apps/server/src/device/SshDeviceHost.ts`, `sshDeviceScript.ts`: the SSH device host's state lives under `~/.agentd-desktop/device`.
- `apps/server/src/httpCors.ts`: the desktop renderer origins are `agentd-desktop://app` and `agentd-desktop-dev://app`.
- `apps/server/scripts/migrate-dev-db.ts`, `t3-sqlite-state.ts`: the shared dev source is `~/.agentd-desktop`.
- `scripts/dev-runner.ts`: default home and seed source are `~/.agentd-desktop`; reads `AGENTD_DESKTOP_HOME` and drops an inherited one so it cannot override the chosen home.
- `apps/web/src/components/settings/CliCommandSettingsRow.tsx`, `settingsSearch.ts`, `apps/web/src/state/desktopCliCommand.ts`, `components/onboarding/WelcomePage.tsx` (comment): name the `agentd-desktop` command instead of `t3`.
- Tests updated for the new names: `DesktopAppIdentity`, `DesktopClerk`, `DesktopCliCommand` (also checks no `t3` is linked), `DesktopEnvironment`, `DesktopLifecycle`, `DesktopLinuxUrlHandler`, `DesktopPreReadyFileSystem`, `DesktopPreReadyPlatform`, `DesktopUserData` (own profile, nothing copied from T3 Code's), `DesktopWslEnvironment`, server `EnvironmentAuth`, `ws`, `cli/app`, `cli/config` (also checks `AGENTD_DESKTOP_HOME` beats `T3CODE_HOME`), `cli/theme`, `cloud/bootService` (a path value only), `sshDeviceScript`, `scripts/dev-runner`, shared `promptLinks`, `remote`, `providerAuthReturnUrl`.
- `apps/desktop/src/app/DesktopClerk.test.ts`: the hosted sign-in test returns to a loopback web client instead of `app.t3.codes`, which #4 stopped accepting; it failed on main and runs in `check:changed` now that the file changed. `CodexAuthCallback.test.ts` has the same stale URL and still fails on main; it is not changed here.

## Windows

Paths are built with `path.join` from the OS home (`%USERPROFILE%`); the command is `agentd-desktop.cmd`, and the
existing user-PATH writer adds `<data folder>\bin`. The shim still sets `T3CODE_HOME` only when it is unset, and
the server prefers `AGENTD_DESKTOP_HOME`, so either variable chooses the home. Covered by the existing win32 unit
tests on Linux; not run on a Windows machine, nor was the NSIS protocol registration checked on one.

## Not changed

- `packages/shared/src/devHome.ts`: the per-worktree dev folder `<worktree>/.t3` stays, as the task allows.
- `scripts/install.sh`, `scripts/install.ps1`, `scripts/npm-launcher/t3.mjs`: upstream's standalone `t3` CLI installers, not part of the desktop app.
- `apps/mobile`: still uses `t3code://`; our builds ship no mobile app.
- The background service's names (`t3code` systemd unit / launchd label / Windows task folder under `%LOCALAPPDATA%\t3code`) and the user-visible sentences that still say `t3` or `T3CODE_HOME` (#67's).
