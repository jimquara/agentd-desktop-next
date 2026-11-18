# 69: Own background service and per-user folder names

On a machine that also has T3 Code, AgentD Desktop no longer installs, updates, stops or removes T3 Code's
background service, and creates no per-user folder named `t3code`.

## Renamed OS-level names

| What                               | Was (T3 Code's)                                                                          | Now                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| systemd user unit                  | `t3code.service`                                                                         | `agentd-desktop.service`                                                                                                      |
| launchd label / plist              | `com.t3tools.t3code.service` (`~/Library/LaunchAgents/com.t3tools.t3code.service.plist`) | `ai.libraos.agentd-desktop.service` (`….plist`)                                                                               |
| Windows task file                  | `%LOCALAPPDATA%\t3code\t3code-task.xml`                                                  | `%LOCALAPPDATA%\agentd-desktop\agentd-desktop-task.xml`                                                                       |
| Windows scheduled task name        | `t3code-<DOMAIN>-<USER>`                                                                 | `agentd-desktop-<DOMAIN>-<USER>`                                                                                              |
| systemd slices for agents          | `app-t3code.slice`, `app-t3code-agents.slice`, `app-t3code-agents-<hash>.slice`          | `app-agentd-desktop.slice`, `app-agentd-desktop-agents.slice`, `app-agentd-desktop-agents-<hash>.slice`                       |
| systemd scopes for agent processes | `t3code-<name>-<id>.scope`                                                               | `agentd-desktop-<name>-<id>.scope` (stop acts only on this prefix)                                                            |
| Compile caches                     | `<XDG cache or ~/.cache or temp>/t3code/compile-cache`                                   | `…/agentd-desktop/compile-cache`                                                                                              |
| GNOME extension backups            | `<XDG data>/t3code/extension-backups`                                                    | `<XDG data>/agentd-desktop/extension-backups`                                                                                 |
| Hyprland capture executable        | `<XDG data>/t3code/hyprland-capture/`                                                    | `<XDG data>/agentd-desktop/hyprland-capture/`                                                                                 |
| KDE capture executable             | `<XDG data>/t3code/kde-capture/`                                                         | `<XDG data>/agentd-desktop/kde-capture/`                                                                                      |
| KDE desktop file id                | `com.t3tools.T3Code.KdeCapture.desktop`                                                  | `ai.libraos.agentd-desktop.KdeCapture.desktop` (installed in `<XDG data>/applications`, where T3 Code installs the same file) |
| App control socket folder          | `<temp>/t3code-<uid>`                                                                    | `<temp>/agentd-desktop-<uid>`                                                                                                 |
| App control pipe (Windows)         | `\\.\pipe\t3code-app-<hash>`                                                             | `\\.\pipe\agentd-desktop-app-<hash>`                                                                                          |

The update command recognises the running service by the new unit (`/agentd-desktop.service` in the process's
cgroup). Install, update, repair and uninstall all go through the same constants, so they only ever act on
`agentd-desktop`; nothing stops, removes or migrates a `t3code` service.

`OS_NAME` and `LAUNCHD_SERVICE_LABEL` are in `packages/shared/src/desktopIdentity.ts` (ours, from #66). The service
launcher keeps its own literal because it must load without Effect.

## Removing a leftover `t3code` service from a test build (agentd.1 to agentd.3)

Those builds installed their service under T3 Code's names. Only remove it if T3 Code is not installed, or if you
know the service is the test build's (its unit or plist runs the AgentD Desktop binary):

- **Linux:** `systemctl --user disable --now t3code.service`, then delete `~/.config/systemd/user/t3code.service`
  and run `systemctl --user daemon-reload`.
- **macOS:** `launchctl bootout gui/$(id -u)/com.t3tools.t3code.service`, then delete
  `~/Library/LaunchAgents/com.t3tools.t3code.service.plist`.
- **Windows:** `schtasks /Delete /TN t3code-%USERDOMAIN%-%USERNAME% /F`, then delete `%LOCALAPPDATA%\t3code`.

The old folders `~/.cache/t3code`, `~/.local/share/t3code` and `~/.local/share/applications/com.t3tools.T3Code.KdeCapture.desktop`
may also be left by a test build; delete them only if T3 Code is not installed.

## Upstream files changed

- `apps/server/src/cloud/bootService.ts`: unit, launchd label and Windows task folder from `OS_NAME` / `LAUNCHD_SERVICE_LABEL`.
- `apps/server/src/serviceLauncher.ts`: Windows task folder and scheduled task name `agentd-desktop-<DOMAIN>-<USER>`.
- `apps/server/src/cli/update.ts`: the cgroup check looks for our unit file.
- `apps/server/src/process/agentScope.ts`: agent slices and scopes use `agentd-desktop`, so memory limits set on them never touch T3 Code's.
- `apps/server/src/cliCompileCache.ts`, `apps/desktop/src/compileCache.ts`: compile cache folder `agentd-desktop` (literal: loads before anything else).
- `apps/desktop/src/snapShot/GnomeCaptureSetup.ts`, `HyprlandSnapShot.ts`, `KdeSnapShot.ts`: data folders under `agentd-desktop`; KDE desktop file id renamed.
- `packages/shared/src/desktopAppControl.ts`: app control socket folder and Windows pipe name.
- Tests updated for the new names: `cloud/bootService`, `serviceLauncher`, `process/agentScope`, `cli/update`, `cliCompileCache`, shared `desktopAppControl` (the darwin long-path case shortened to fit the longer folder name), desktop `GnomeCaptureSetup`.
- `apps/server/src/cli/update.test.ts`: two managed-policy expectations still said "T3 Code" after #24 renamed that sentence; they fail on main and run in `check:changed` now that the file changed.

## Not changed

- The sentence in `bootService.ts` telling Linux users to run `systemctl --user status t3code.service` when the service is not running: a user-visible sentence, #67's. It should name `agentd-desktop.service`.
- D-Bus interface `com.t3tools.SnapShot` and path `/com/t3tools/SnapShot` (Niri capture): the bus name a user's Niri config calls is `<app id>.SnapShot`, already `ai.libraos.agentd-desktop.SnapShot`, so it cannot meet T3 Code's. The interface name is not installed anywhere on its own.
- The KDE helper marker `X-T3Code-Capture-Helper=true` and executable `t3-kde-snap-shot`: inside our own file and folder, not a name the OS looks up.
- Managed policy locations (`SOFTWARE\Policies\T3Tools\T3Code`, `/Library/Managed Preferences/com.t3tools.t3code.plist`, the ADMX namespace): an administrator creates them, the app only reads them; renaming changes the admin contract and is a separate decision.
- Random temporary files and folders (`t3-*-capture-`, `t3code-cookie-import-`, Codex text generation temps), files inside our own data folder or profile, `T3CODE_*` variables, `TERM_PROGRAM`, `@t3tools/*` packages, telemetry `service.namespace`/`serviceName`.

## Windows

Paths are joined with `path.join` / `NodePath.win32.join` from `%LOCALAPPDATA%`; the task name is built from
`USERDOMAIN` and `USERNAME` as before. Covered by the existing win32 unit tests (task file path, `/TN` names) run on
Linux; not run on a Windows machine.
