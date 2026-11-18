# #9 — Session panel

- `apps/web/src/components/chat/ThreadDetailsPanel.tsx` — Regroup existing workspace and Git rows under Environment, and render standalone sections from the item list.
- `apps/web/src/components/chat/ThreadDetailsCard.tsx` — Let the Outputs list scroll without displacing Environment controls at compact heights.
- `apps/web/src/components/chat/threadDetailsItems.ts` — Default Context and Outputs to visible, preserve explicit preferences, and register standalone section components in display order.
- `apps/web/src/components/chat/ThreadDetailsUsage.tsx` — Show context percentage and token count inline, with an explicit state for missing data.
- `apps/web/src/components/chat/ThreadDetailsOutputs.tsx` — List recent changed files from checkpoints and link to their turn diffs.
- `apps/web/src/components/chat/threadDetailsItems.test.ts` — Update the existing visibility test for the fresh-profile defaults and explicit Context override.
- `apps/web/src/components/chat/ThreadDetailsPanel.browser.test.tsx` — Update the existing panel checks for the headings and fallback, and cover file ordering and diff navigation.

Windows and Linux use the same web UI. Outputs passes each Git path through verbatim, preserving case and separators for the existing diff viewer. No filesystem paths are constructed and no processes are started by the panel. Verified in Chromium on Linux; native Windows was not available.
