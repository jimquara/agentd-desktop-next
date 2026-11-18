# 7 — Default project sidebar

- `packages/contracts/src/settings.ts`: Default the existing sidebar preference to grouped without changing explicit opt-outs.
- `apps/web/src/components/settings/settingsSearch.ts`: Rename the Labs setting at its shared row and search source.
- `apps/web/src/components/settings/LabsSettingsPanel.tsx`: Reuse the searchable title for the toggle's accessible label.
- `apps/web/src/components/sidebar/SidebarProjectFolderHeader.tsx`: Add accessible headings with machine labels and a visible New session action.
- `apps/web/src/sidebarProjectGrouping.ts`: Keep remote machine labels in hosted clients without a primary environment.
- `apps/web/src/components/Sidebar.logic.ts`: Keep empty open project folders at the existing selection point without touching `Sidebar.tsx`.
- `apps/web/src/components/Sidebar.logic.test.ts`: Cover session grouping and empty open, archived, and scratch folders.
- `apps/web/src/environmentGrouping.test.ts`: Cover mixed and remote-only location snapshots.
- `apps/web/src/components/Sidebar.browser.test.tsx`: Cover fresh defaults, local and remote headings, and starting a session from an empty project.
- `docs/user/thread-sidebar.md`: Explain the grouped default, collapse persistence, and the Labs opt-out.

Windows and Linux share these desktop UI changes. They use the existing environment and UI state, without adding filesystem, shell, binary, or platform-specific logic. Verified on Linux; no native Windows host was available.
