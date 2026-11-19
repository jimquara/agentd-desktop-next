import {
  AgentdCommandError,
  type AgentdCloudReview,
  type AgentdCloudReviewInput,
  type AgentdError,
  type AgentdHandoffShowJson,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Random from "effect/Random";

import type { ProcessRunner } from "../processRunner.ts";
import { GITHUB_PROJECT } from "./agentdCloud.ts";

// What a cloud task's branch changed and where its pull request is, read without touching the
// checkout: git fetches into refs of its own under refs/agentd/, diffs them and deletes them.

const PATCH_LIMIT = 512 * 1024;
const COMPARE_URL_LIMIT = 4000;
const TITLE_LIMIT = 70;
const DIFF_OPTIONS = ["--no-color", "--no-ext-diff", "--no-textconv"];
const CREDENTIAL =
  /\b(?:sk-(?:ant-|proj-|svcacct-)?[\w-]{12,}|gh[pousr]_[\w-]{12,}|github_pat_[\w-]{12,}|adt_[\w-]{16,})/gi;
const PR_REF = /^([a-z\d][a-z\d-]{0,38}\/[\w.-]{1,100})#([1-9]\d{0,9})$/i;

export const REVIEW_REASONS = {
  unavailable: "This task has no pushed branch to review.",
  origin: "This checkout’s origin isn’t the task’s GitHub repository.",
  git: "Git is needed to review these changes.",
  branchGone: "The task’s branch is no longer on GitHub.",
  access: "No access to this repository on GitHub. Check your GitHub sign-in for this checkout.",
  fetch: "Couldn’t fetch the branch from GitHub. Check your connection and try again.",
  diff: "Couldn’t compare the branch with the repository’s default branch.",
} as const;

const reviewError = (message: string) => new AgentdCommandError({ message, notSetUp: false });

function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value.trim() === "" ? null : value;
}

function cloudStateOf(show: AgentdHandoffShowJson): string | null {
  return nonEmpty(show.cloud?.state) ?? nonEmpty(show.cloud_state);
}

/** The pushed branch of a finished cloud task, with its GitHub project; null for any other task. */
function reviewableBranch(
  show: AgentdHandoffShowJson,
): { readonly project: string; readonly branch: string } | null {
  const project = nonEmpty(show.project)?.toLowerCase() ?? null;
  const branch = nonEmpty(show.worker_branch);
  if (cloudStateOf(show) !== "completed" || project === null || branch === null) return null;
  if (!GITHUB_PROJECT.test(project) || /[\0\s]/.test(branch) || branch.startsWith("-")) return null;
  return { project, branch };
}

function pullRequestFields(goal: string): { title: string; body: string } | null {
  const body = goal.replace(CREDENTIAL, "[redacted]");
  const line = body.trim().split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (line === "") return null;
  const characters = Array.from(line);
  const title =
    characters.length > TITLE_LIMIT
      ? `${characters
          .slice(0, TITLE_LIMIT - 1)
          .join("")
          .trimEnd()}…`
      : line;
  return { title, body };
}

/**
 * The task's own pull request when agentd links one, else GitHub's compare page for its branch with
 * the goal as title and body; the body is left out when the link would be too long to open.
 */
export function cloudPullRequest(
  show: AgentdHandoffShowJson,
): { readonly url: string; readonly number: number | null } | null {
  const reviewable = reviewableBranch(show);
  if (reviewable === null) return null;
  for (const ref of show.prs ?? []) {
    const match = PR_REF.exec(ref);
    if (match?.[1]?.toLowerCase() === reviewable.project) {
      return { url: `https://github.com/${match[1]}/pull/${match[2]}`, number: Number(match[2]) };
    }
  }
  const branchPath = reviewable.branch.split("/").map(encodeURIComponent).join("/");
  const url = new URL(`https://github.com/${reviewable.project}/compare/${branchPath}`);
  url.searchParams.set("quick_pull", "1");
  const fields = pullRequestFields(show.body?.goal ?? "");
  if (fields !== null) {
    url.searchParams.set("title", fields.title);
    url.searchParams.set("body", fields.body);
    if (url.href.length > COMPARE_URL_LIMIT) url.searchParams.delete("body");
  }
  return { url: url.href, number: null };
}

/** One line for a failed fetch, from git's own wording. */
export function fetchFailureReason(stderr: string): string {
  if (/couldn't find remote ref|no such remote ref|not our ref/i.test(stderr)) {
    return REVIEW_REASONS.branchGone;
  }
  if (
    /authentication failed|permission denied|repository not found|could not read (?:username|password)|terminal prompts disabled|requested URL returned error: 40[134]|access denied/i.test(
      stderr,
    )
  ) {
    return REVIEW_REASONS.access;
  }
  return REVIEW_REASONS.fetch;
}

// Cut at the last whole file so the diff view parses every file it gets.
function limitPatch(text: string, truncated: boolean): { patch: string; truncated: boolean } {
  if (!truncated && text.length <= PATCH_LIMIT) return { patch: text, truncated: false };
  const head = text.slice(0, PATCH_LIMIT);
  const lastFile = head.lastIndexOf("\ndiff --git ");
  return { patch: lastFile > 0 ? head.slice(0, lastFile + 1) : head, truncated: true };
}

export function makeCloudReview(deps: {
  readonly runProcess: ProcessRunner["Service"]["run"];
  readonly readShow: (id: string) => Effect.Effect<AgentdHandoffShowJson, AgentdError>;
  readonly originProject: (cwd: string) => Effect.Effect<string | null>;
}) {
  const { runProcess, readShow, originProject } = deps;

  const git = (
    cwd: string,
    args: ReadonlyArray<string>,
    options: { readonly timeout?: `${number} seconds`; readonly maxOutputBytes?: number } = {},
  ) =>
    runProcess({
      command: "git",
      args: [
        "--no-pager",
        "-C",
        cwd,
        "-c",
        "core.fsmonitor=false",
        "-c",
        "gc.auto=0",
        "-c",
        "maintenance.auto=false",
        ...args,
      ],
      cwd,
      env: { GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_NO_LAZY_FETCH: "1" },
      timeout: options.timeout ?? "10 seconds",
      maxOutputBytes: options.maxOutputBytes ?? 64 * 1024,
      outputMode: "truncate",
      timeoutBehavior: "timedOutResult",
    }).pipe(
      Effect.mapError((error) =>
        reviewError(error._tag === "ProcessSpawnError" ? REVIEW_REASONS.git : REVIEW_REASONS.fetch),
      ),
    );

  return Effect.fn("AgentdBridge.cloudReview")(function* ({ id, cwd }: AgentdCloudReviewInput) {
    const show = yield* readShow(id);
    const reviewable = reviewableBranch(show);
    if (reviewable === null) return yield* reviewError(REVIEW_REASONS.unavailable);
    if ((yield* originProject(cwd)) !== reviewable.project) {
      return yield* reviewError(REVIEW_REASONS.origin);
    }
    const { branch } = reviewable;
    const format = yield* git(cwd, ["check-ref-format", `refs/heads/${branch}`]);
    if (format.code !== 0) return yield* reviewError(REVIEW_REASONS.unavailable);

    // Unique per review, so two windows reviewing at once never share or delete each other's refs.
    const parts = yield* Effect.all(
      Array.from({ length: 4 }, () => Random.nextIntBetween(0, 0xffffffff)),
    );
    const scope = `refs/agentd/desktop-review/${parts.map((part) => part.toString(16).padStart(8, "0")).join("")}`;
    const base = `${scope}/base`;
    const head = `${scope}/head`;
    const compare = Effect.gen(function* () {
      // Options every supported Git has: no --atomic, --no-write-fetch-head or --refmap.
      const fetched = yield* git(
        cwd,
        [
          "fetch",
          "--no-tags",
          "--no-recurse-submodules",
          "--",
          "origin",
          `HEAD:${base}`,
          `refs/heads/${branch}:${head}`,
        ],
        { timeout: "25 seconds" },
      );
      if (fetched.timedOut) return yield* reviewError(REVIEW_REASONS.fetch);
      if (fetched.code !== 0) return yield* reviewError(fetchFailureReason(fetched.stderr));
      const diff = yield* git(cwd, ["diff", ...DIFF_OPTIONS, `${base}...${head}`, "--"], {
        timeout: "20 seconds",
        maxOutputBytes: PATCH_LIMIT + 1,
      });
      if (diff.timedOut || diff.code !== 0) return yield* reviewError(REVIEW_REASONS.diff);
      return {
        branch,
        ...limitPatch(diff.stdout, diff.stdoutTruncated),
      } satisfies AgentdCloudReview;
    });
    return yield* compare.pipe(
      Effect.ensuring(
        Effect.forEach(
          [base, head],
          (ref) => git(cwd, ["update-ref", "-d", ref]).pipe(Effect.ignore),
          {
            discard: true,
          },
        ),
      ),
    );
  });
}
