# 82: Cloud Workers hardening, batch 1

Ported from agentd-desktop's fixes in 3e330b8347, 7b08be6500, efa6bdc049, 7ef27ad82e and 1fb1912569. The behaviour is ported, not the code.

- **No duplicate paid offer.** Before each cloud offer, the server reserves it in agentd with a pin in a session of its own for the GitHub project (`desktop-cloud-<digest of OWNER/REPO>`). Every checkout and window of that project sees the same reservation. The offer carries the reservation id as `--idem` and as a `--state` marker. If the outcome is unknown (timeout, killed process, unreadable receipt), the server looks for the task with `find "<marker>" --kind handoff`. If it finds one, it records that task and shows it. If it finds none, the error is marked `outcomeUnknown`, and the next Start checks again before it offers anything. A retry of the same draft reuses the same key, so agentd keeps a single offer. Two windows that reserve after the same record derive the same next id.
- **Project reservation.** A Start is refused with a one-line reason in two cases. The first is a project whose reserved task agentd is still submitting (`cloud_state` submitting): the reason names that task. The second is a different draft while the earlier submission has no task in agentd. The dialog then offers "Submit this task in its place", which reuses the earlier key. A second Start for the same project in this server waits for the first to finish.
- **Failure reasons.** `cloudFailure.ts` maps agentd's wording to one line, covering GitHub App setup, account setup, credit, private credential files, v0.1.14 Claude subscription refusals (not enabled, sign-in invalid, usage limit, not through a team server), check, environment, time and push. Task notes use these reasons on the row and in the AgentD page. The Start dialog shows them as well.
- **False positives.** Setup and key-file problems are recognised only by agentd's phrases. A message that contains a path with `byok`, `cloud-key` or `[cloud]` is no longer reported as a credential or setup problem. GitHub origins are accepted in the forms 1fb1912569 handles: `www.github.com`, `git+ssh://`, a user in an https URL, an ssh port, `ssh.github.com:443` and `git@github.com:`. A project name that looks like a token is not refused.

Files:

- `apps/server/src/agentd/agentdCloud.ts`: reserve, reconcile and retry cloud offers; project reservation refusal; GitHub origin forms; one-line refusals.
- `apps/server/src/agentd/agentdCloudSubmissions.ts` (new): submission fingerprint, ids, marker and the reading of reservation pins and `find` hits.
- `apps/server/src/agentd/cloudFailure.ts` (new): one-line reasons for refusals and failed jobs.
- `apps/server/src/agentd/agentdCommands.ts`: fixed argument lists for the pin, find and `--idem`/`--state` offer commands.
- `apps/server/src/agentd/agentdJson.ts`: task notes take the failure reason for the job's state.
- `apps/server/src/agentd/AgentdBridge.test.ts`: stub agentd ledger. Covers unknown outcome, same-key retry, recovery from another checkout, project reservation, replacement, refusal reasons and origin forms.
- `apps/server/src/agentd/cloudFailure.test.ts` (new): job note reasons, including v0.1.14 subscription refusals and path false positives.
- `packages/contracts/src/agentd.ts`: `outcomeUnknown` and `replaceSubmission` on `AgentdCommandError`, `replaceSubmission` on the cloud input, `body.state` on `handoff show`.
- `apps/web/src/components/agentd/StartTaskDialog.tsx`: "Check and retry" and "Checking the earlier submission…" after an unknown outcome; "Submit this task in its place" for an earlier submission with no task. The revealCodeMode line is untouched.
- `apps/web/src/components/agentd/StartTaskDialog.browser.test.tsx`: the unknown-outcome and replacement flow.

Not verified:

- **Windows:** not run natively. The process runner, `isAbsolute` path check and argv construction are unchanged. The tests use Windows-shaped paths when the platform is win32. The pin record and the `--state` marker contain no paths.
- **macOS:** not run.
- **Linux:** the server and browser tests ran here against a stub agentd. A real agentd v0.1.14 answered only `pin list --session … --json` and `find … --kind handoff --json`, both read-only. No paid cloud offer was made, so `--idem` deduplication on `handoff offer --cloud` is taken from agentd's documented rule and the reference's use of it.
- **zh:** the new dialog strings are wrapped with gt, but `i18n:generate` was not run and the catalogs were not filled. That step is open.
