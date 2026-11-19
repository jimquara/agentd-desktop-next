# 83: Cloud Workers, batch 2: review a finished cloud task's branch and open its pull request

Ported from agentd-desktop's `readCloudBranchPatch` and `taskPullRequest` (2241cb8b9d, a7df868584, 07c74824ec). The behaviour is ported, not the code.

- **Review changes.** A finished cloud task (`cloud_state` completed) with a pushed branch gets Review changes when the environment has a git project whose origin is the task's GitHub repository. The server checks again that the checkout's `origin` is that repository. Then it runs `git check-ref-format`, fetches `origin HEAD` and the branch into two refs of its own under `refs/agentd/desktop-review/<random>/`, diffs `base...head`, and deletes both refs afterwards, whether the diff worked or failed. It never checks out, resets or stashes, so the checkout's branch, index and uncommitted changes stay as they were. The fetch uses only options that older Git has: no `--atomic`, `--no-write-fetch-head` or `--refmap`. Git runs with `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, `core.fsmonitor=false` and auto gc and maintenance off. The diff opens in a dialog that uses the diff panel's viewer (`StyledDiffCodeView`) and its layout and word-wrap settings. It is cut at the last whole file at 512 KiB and says when it was cut.
- **One-line failures.** Branch gone, no access (repository not found, auth or publickey refused, prompts disabled, 401/403/404) and fetch failed (any other failure, or a timeout) each show one line. So do a missing git and an origin that is not the task's repository.
- **Open pull request.** The task read carries `cloud.pullRequest`. That is the task's own PR when agentd links one for the same repository (`prs`, OWNER/REPO#N), else GitHub's compare page for the branch: path separators kept, each segment escaped, `quick_pull=1`, the goal's first line as the title (70 characters) and the goal as the body, with credentials redacted. The body is dropped when the link would pass 4,000 characters, so a long pasted log never blocks it. The desktop opens it through `shell.openExternal`, and the web build follows the link. The app pushes and merges nothing.
- **Where.** Both actions sit on the finished task row (in its action slot, outside the collapse trigger) and under each finished task in the AgentD page's Cloud Workers section. A folder workspace without git has no repository identity, so it never matches, and Review is not offered.

Files:

- `apps/server/src/agentd/agentdCloudReview.ts` (new): reviewable branch, fetch and diff into temporary refs, one-line fetch reasons, pull request link.
- `apps/server/src/agentd/agentdCloudReview.test.ts` (new): the two reference cases (legacy-Git review that leaves the checkout unchanged; compare link escaping and a long log), branch gone, origin mismatch or no git, not finished or bad branch name, access/fetch wording, existing PR.
- `apps/server/src/agentd/agentdCloud.ts`: export `GITHUB_PROJECT` and the origin lookup for the review.
- `apps/server/src/agentd/agentdJson.ts`: `cloud.pullRequest` on the task read.
- `apps/server/src/agentd/AgentdBridge.ts`: append `cloudReview`.
- `apps/server/src/ws.ts`: append the thin `agentd.cloudReview` handler.
- `apps/server/src/auth/RpcAuthorization.ts`: append the review under the orchestration read scope; it only adds and deletes its own refs.
- `apps/server/src/observability/RpcInstrumentation.ts`: append the review to the AgentD group.
- `packages/contracts/src/agentd.ts`: `prs` on `handoff show`, `cloud.pullRequest` on the task, the review input and result.
- `packages/contracts/src/rpc.ts`: append the review RPC.
- `packages/client-runtime/src/state/agentd.ts`: append the review query atom.
- `apps/web/src/components/agentd/CloudTaskReview.tsx` (new): Review changes dialog and Open pull request.
- `apps/web/src/components/agentd/backgroundTasks.logic.ts`: `cloudReviewCheckout`, which picks a git project whose origin is the task's repository.
- `apps/web/src/components/agentd/AgentdBackgroundTaskRow.tsx`: the actions on a finished cloud row.
- `apps/web/src/components/agentd/AgentdPageWorkers.tsx`: the actions under finished Cloud Workers tasks.
- `apps/web/src/components/agentd/BackgroundTasksPane.browser.test.tsx`: no Review for a folder workspace, Review from a fork checkout by its origin, the one-line error, and the PR link.

Not verified:

- **Windows:** not run natively. Git runs through the existing process runner with an argv list and no shell string. The ref names and refspecs contain no paths. A Windows checkout path reaches git only as `-C` and the process cwd.
- **macOS:** not run.
- **Linux:** the server tests ran here with real git 2.56 on temporary repositories, with options that older Git lacks refused, as in the reference. The browser test ran in Chromium. No real GitHub fetch was made, so the access and network wording is matched against GitHub's and git's documented messages, not observed ones. Opening the link through the desktop bridge was not exercised in Electron.
- **i18n:** new strings are wrapped with `gt` and `T`; catalogs regenerated and zh filled. The server's one-line reasons are English, as batch 1's are.
