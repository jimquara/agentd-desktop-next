# 15: Desktop bundles agentd and tells the server where it is

Upstream files changed:

- `scripts/build-desktop-artifact.ts`: `stageAgentdCli` (beside `stageResourceMonitor`) copies `agentd-<os>-<arch>[.exe]` for the target from `AGENTD_DIST_DIR` into `resources/agentd/agentd[.exe]` after checking it against the directory's `SHA256SUMS` (missing or mismatched fails the build); mac universal is `lipo`ed from amd64 and arm64. Unset `AGENTD_DIST_DIR` stages nothing. `DESKTOP_EXTRA_RESOURCES` gains `agentd/` (electron-builder skips a missing source directory). Outside the owned regions: one `stageAgentdCli` call after `stageResourceMonitor` in the staging sequence, and four `DESKTOP_FILE_EXCLUSIONS` lines so the binary is not also packed into `app.asar`.
- `scripts/build-desktop-artifact.test.ts`: test for staging, unset and sha256 mismatch.
- `apps/desktop/src/backend/agentdBinary.ts` (new): finds the bundled agentd as the resource monitor is found, the user's on `PATH`, reads `agentd version` from each, and picks one.
- `apps/desktop/src/backend/agentdBinary.test.ts` (new): the choice, with hand-written versions.
- `apps/desktop/src/backend/DesktopBackendConfiguration.ts`: the primary (non-WSL) backend starts with `AGENTD_BIN` set to the chosen binary.
- `apps/desktop/src/backend/DesktopBackendConfiguration.test.ts`: test that `AGENTD_BIN` follows the bundled or newer user binary.

Rule for `AGENTD_BIN`:

- No bundled agentd (dev, or a build without `AGENTD_DIST_DIR`), or `AGENTD_BIN` already set in the app's environment: left as it was.
- Otherwise the bundled binary, unless an `agentd` (`agentd.exe` on Windows) in an absolute `PATH` folder reports a semver version (`agentd version` → `agentd vX.Y.Z[-pre]`) strictly newer than the bundled one. Equal keeps the bundled; an unreadable user version keeps the bundled; an unreadable bundled version takes the user's. `PATH` is read after the login-shell environment is installed, at every backend start.
- The WSL backend gets no `AGENTD_BIN`: the bundled Windows binary does not run inside WSL.
