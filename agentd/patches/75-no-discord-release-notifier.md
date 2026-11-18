# No Discord release notifier

- `scripts/notify-discord-release.ts` and its test: removed. Upstream's release workflow called it to announce releases on upstream's Discord; that workflow was replaced (`5c542bf4ee`), nothing calls the script, and its test read `.github/workflows/release.yml`, failing CI with ENOENT.
