# 17: Background tasks pane

- `apps/web/src/components/agentd/BackgroundTasksPane.tsx` — show the scoped environment's agentd task counts, session commands, and distinct list states in the existing tab.
- `apps/web/src/components/agentd/BackgroundTaskCard.tsx` — share an expandable row layout for agentd and session work.
- `apps/web/src/components/agentd/AgentdBackgroundTaskRow.tsx` — show detail fields, elapsed time and verdict, and gate Stop on confirmation and the destination environment's permission.
- `apps/web/src/components/agentd/AgentdTaskOutput.tsx` — subscribe on expansion and follow the log tail without interrupting someone reading earlier output.
- `apps/web/src/components/agentd/SessionBackgroundTaskRow.tsx` — show the session's own work first and reuse the existing command output view.
- `apps/web/src/components/agentd/backgroundTasks.logic.ts` — classify the CLI's rows and translate its worker states and check verdicts into short labels.
- `apps/web/src/components/agentd/backgroundTasks.logic.test.ts` — cover lifecycle and verdict wording against hand-written cases.
- `apps/web/src/components/agentd/BackgroundTasksPane.browser.test.tsx` — exercise details, streaming output layout and the real confirmation dialog with bridge fixtures.

Running counts nonterminal agentd handoffs, including queued and waiting ones. The separate session count does not change the agentd total. The pane has no merge action or direct CLI calls.

Bridge follow-up: expose actual worker start and finish timestamps instead of the task's creation and last update, and keep the CLI's `a2a_state` for waiting on approval when `worker_state` is unset. The pane flags the available timestamps in tooltips and uses agentd's worker and budget states for waiting. Location comes from the task detail (`lease_device` distinguishes team from local); output is available only when the bridge can read the reported worker log from its host.

The web and desktop renderer use the same environment-scoped contracts on Linux and Windows. No executable discovery, filesystem paths or new process launches were added. Verified in Linux Chromium; native Windows and live team/cloud log access were not exercised.
