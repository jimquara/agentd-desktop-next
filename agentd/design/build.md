# Internal test build: Linux AppImage and Windows installer

The internal test build of AgentD Desktop, with agentd inside. Built 2026-11-18 on the Linux build host (x86_64, Ubuntu 22.04, no Rust, Wine, sudo or Windows; Docker available). Nothing was published: no release, tag or upload.

## What was built

| File (in `release/`)                          | Size                        | Target                                           |
| --------------------------------------------- | --------------------------- | ------------------------------------------------ |
| `AgentD-Desktop-0.1.10-agentd.1-x64.AppImage` | 263,330,011 bytes (251 MiB) | Linux x64, unpacked 680 MiB                      |
| `AgentD-Desktop-0.1.10-agentd.1-x64.exe`      | 219,374,582 bytes (209 MiB) | Windows x64, NSIS one-click, unpacked 711 MiB    |
| `AgentD-Desktop-0.1.10-agentd.1-amd64.deb`    | 216,823,528 bytes (207 MiB) | Linux x64; upstream's Linux target also makes it |

Version `0.1.10-agentd.1`: upstream's `apps/desktop/package.json` version, then `-agentd.N`. These builds are on the stable channel (`resolveDesktopUpdateChannel` gives `latest`, so the production icon and name, not nightly ones), and they have no update feed: no `app-update.yml`, so the app's updater says no feed is configured.

What each contains, checked by unpacking it:

- **AppImage:** `resources/agentd/agentd` is the agentd v0.1.13 release asset `agentd-linux-amd64` (sha256 `15c041cd…23f8f4`, as in the release's `SHA256SUMS`; it runs and prints `agentd v0.1.13 0d0b360a58c0`). The launcher `ai.libraos.agentd-desktop.desktop` says `Name=AgentD Desktop`, `X-AppImage-Version=0.1.10-agentd.1`, and its icon `agentd-desktop.png` (hicolor 16 to 512 px) is the AgentD mark. Also the resource monitor, KDE and Hyprland capture helpers and the browser secret helper, all built from source in the container.
- **Windows installer:** `$PLUGINSDIR/app-64.7z` holds `AgentD Desktop.exe` and `resources/agentd/agentd.exe`, the v0.1.13 release asset `agentd-windows-amd64.exe` (sha256 `992ee3f4…ca9bf7`, as in `SHA256SUMS`). The icon resource of both `AgentD Desktop.exe` and the installer is the AgentD mark (7 sizes, 16 to 256 px). `resources/resource-monitor/t3-resource-monitor.exe` is built with MinGW (see below).

## How

```sh
. /data/mnt-data/ccao/libraos/.desktop-next-toolchain/env.sh   # Node 26.13.1, dependencies installed
agentd/scripts/build-desktop.sh linux    # 2 min 40 s here once the image exists (first image build: about 2 min more)
agentd/scripts/build-desktop.sh win      # 1 min 40 s here
```

`agentd/scripts/build-desktop.sh` sets the version (`AGENTD_BUILD_N`, default 1), downloads the agentd release (`AGENTD_RELEASE`, default the latest of `libraos/agentd`) with `gh` into `release/agentd-dist/<tag>` unless `AGENTD_DIST_DIR` names one, clears the update repository variables, and runs upstream's packager `scripts/build-desktop-artifact.ts --platform linux|win --target AppImage|nsis --arch x64`. The packager checks each agentd asset against `SHA256SUMS` before bundling it (task #15).

It runs the packager in a container, because the host lacks what upstream's build needs and has no sudo to install it:

- Base: electron-builder's Wine image, `electronuserland/builder:wine` pinned as `sha256:f3a8d451994c881d0972e7b1846ee4d4fdc15eb41fc6b1f350b38cbf99ca90fe` (Ubuntu 22.04, Wine 11.0, libsecret headers).
- Added once (image `agentd-desktop-builder:<hash of the Dockerfile>`): Rust 1.100.0 with the Linux and `x86_64-pc-windows-gnu` targets (`sysinfo` 0.39 needs Rust 1.95 or newer), MinGW-w64, ImageMagick, and Electron's runtime libraries (the packager runs the packaged Linux app to fill its compile cache).
- The host's Node, the pnpm store, the git directory and the agentd assets are mounted; the repository is mounted at `/w`. The container runs as the calling user, with its home (Electron and electron-builder caches, Wine prefix, Cargo registry) in `release/.agentd-build-home`.

`AGENTD_BUILD_ON_HOST=1` skips the container on a host that has upstream's prerequisites (Linux: cargo, cc, make, libsecret-1-dev, ImageMagick; Windows: upstream's Windows build tools).

### Resource monitor without Rust on the host

No upstream change: the container has Rust, so the Linux build compiles the monitor with `cargo` as upstream does. MSVC does not exist off Windows, so for Windows the script compiles it with MinGW (`--target x86_64-pc-windows-gnu`), copies the `.exe` to the MSVC target directory the packager reads, and sets upstream's `T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR=1`.

### Windows on Linux

electron-builder makes the NSIS installer with its own Linux `makensis` and uses Wine for `rcedit` (icon and version resources) and for the uninstaller. Two things had to give:

- **makensis crash.** electron-builder's bundled makensis 3.0.4.1 stops with `*** stack smashing detected ***` on an `!include` path of about 285 characters. The path to pnpm's patched `app-builder-lib` templates under a deep checkout reaches that; with the repository mounted at `/w` it does not. Reproduced with a two-line script.
- **glibc check.** On Linux, upstream's packaged-payload check (`scripts/linux-glibc.ts`) fails on any `readelf` stderr, and readelf 2.38 (Ubuntu 22.04) warns about the split-debug links in Electron's `libvulkan.so.1`. It now passes `-wN` (do not follow those links), which leaves the version information it reads unchanged.

Not verified on Windows (no Windows host was used): that the installer installs and the app starts, that the MinGW resource monitor and the bundled `agentd.exe` run, and upstream's Windows-only checks, which the packager skips off Windows (native-module load probe, bundle self-check). If the cross build breaks, the fallback is a Windows runner in `.github/workflows/ci.yml` running `vp run dist:desktop:win` with `AGENTD_DIST_DIR` and `T3CODE_DESKTOP_VERSION` set.

## Not done here

- No signing: both builds are unsigned (`T3CODE_DESKTOP_SIGNED` off), so Windows SmartScreen will warn.
- No arm64 builds.
- The Linux launcher still registers the upstream `t3code` URL scheme; that is the rebrand's region (#2), not this task's.
