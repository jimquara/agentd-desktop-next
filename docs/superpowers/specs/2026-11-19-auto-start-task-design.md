# Start a task with one look: filled-in fields, confirmed in the chat or the dialog

## Why

Starting an AgentD task (local or Cloud Workers) asks for a budget, model access, key paths, a check and a
worker by hand. Most of it can be decided for the person. They should look once and press Start, and only
stop when something is actually wrong. Confirming inside the chat is as good as confirming in the dialog.

## Approaches

- **A. Everything filled in, one Start (chosen).** Fields are decided automatically and folded into a
  one-line summary; the person confirms in the chat or the dialog. Details open only on problems or on Edit.
- B. No confirmation at all: a request in the chat starts the task and the cost is shown afterwards.
  Rejected: it spends money without a look.

## Design

1. **Budget from history.** The server reads `agentd handoff estimate --type TYPE` (exists in agentd-core:
   `HandoffEstimate`, job types `small`, `feature`, `complex`, `implement`; `low`, `median`, `high` in
   dollars; no estimate below 5 past jobs). The dollar cap is `high` rounded up to the next whole dollar;
   for Cloud Workers it is also capped by the balance. Minutes: agentd's default budget when it has one,
   else 60m. Without an estimate: `60m,$5`. The type comes from the draft (below); unknown → `implement`.
   The summary says "Budget up to $5 (similar tasks cost $1.78–4.98)"; for Cloud Workers it adds that the
   estimate comes from local runs of similar tasks. An "Edit" link shows today's budget inputs.
2. **Model access.** Signed in to LibraOS or Gateway connected → LibraOS, and no key paths shown. Otherwise
   "Your API key" with the path inputs open.
3. **Check.** The chat draft already suggests one. A hand-filled task gets a suggestion from the project
   files (`package.json` test script, `go.mod` → `go test ./...`, `Cargo.toml` → `cargo test`,
   `pyproject.toml` → `pytest`), put in the field and editable. No suggestion → the field stays required
   for local tasks as today.
4. **The draft carries a size.** `TASK_DRAFT_PROMPT` and its schema gain `"size": "small" | "feature" |
   "complex" | ""`, used only to choose the estimate type.
5. **Confirm in the chat.** When the chat drafts a task, the assistant's draft reply renders in the
   conversation as a task card: goal, the summary line ("claude · budget up to $5 · LibraOS models · check:
   pnpm test", plus "Cloud Workers" when chosen), **Start** and **Edit**. Start starts it with those fields;
   Edit opens the Start task dialog with them. The dialog shows the same summary with Start; its inputs are
   folded under Edit.
6. **Stop only on problems.** Not enough balance, not signed in for LibraOS, no worker, the directory is not
   a Git repository or is on a protected branch: the card and the dialog show the reason in one line and
   Start is disabled until it is fixed (Edit stays available).

## Constraints

- Windows, macOS and Linux; remote environments read the estimate and project files on their own host.
- No credential contents read or logged; key paths stay paths.
- Budget numbers come from agentd; the UI never invents prices beyond the stated fallback.
- Builds on Cloud Workers hardening batch 1 (duplicate-offer guard): the card's Start goes through the same
  guarded path as the dialog.

## Non-goals

- Starting without any confirmation.
- Changing the Welcome page or Settings.
- A cloud-specific price model (the local estimate is used, labelled as such).

## Left to the builder

- Where the estimate is read (a new agentd bridge read next to the cloud setup read is the obvious place).
- The card's look, within `docs/STYLEGUIDE.md` and existing components.
- Which project files are read for the check suggestion beyond the four above.
