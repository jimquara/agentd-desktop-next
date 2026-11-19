import type { CodeViewDiffItem } from "@pierre/diffs/react";
import type { AgentdTask, AgentdTaskRow, EnvironmentId } from "@t3tools/contracts";
import { T, useGT, useMessages, Var } from "gt-react";
import { ExternalLinkIcon } from "lucide-react";
import { type MouseEvent, useState } from "react";

import { isElectron } from "../../env";
import { useRenderedAppearance } from "../../hooks/useTheme";
import { useClientSettings } from "../../hooks/useSettings";
import { agentdEnvironment } from "../../lib/agentdState";
import {
  getRenderablePatch,
  resolveDiffThemeName,
  resolveFileDiffPath,
} from "../../lib/diffRendering";
import { PREFERRED_HIGHLIGHTER } from "../../lib/syntaxHighlighting";
import { ensureLocalApi } from "../../localApi";
import { useProjects } from "../../state/entities";
import { useEnvironmentQuery } from "../../state/query";
import { StyledDiffCodeView } from "../diffs/StyledDiffCodeView";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { cloudReviewCheckout } from "./backgroundTasks.logic";

function CloudBranchDiff(props: {
  readonly id: string;
  readonly cwd: string;
  readonly environmentId: EnvironmentId;
}) {
  const resolve = useMessages();
  const appearance = useRenderedAppearance();
  const { diffLayout, wordWrap } = useClientSettings((settings) => ({
    diffLayout: settings.diffLayout,
    wordWrap: settings.wordWrap,
  }));
  const { data, error } = useEnvironmentQuery(
    agentdEnvironment.cloudReview({
      environmentId: props.environmentId,
      input: { id: props.id, cwd: props.cwd },
    }),
    resolve,
  );
  if (error !== null) {
    return (
      <p role="alert" className="wrap-anywhere text-destructive text-sm">
        {error}
      </p>
    );
  }
  if (data === null) {
    return (
      <p className="text-muted-foreground text-sm">
        <T>Fetching the branch from GitHub…</T>
      </p>
    );
  }
  const renderable = getRenderablePatch(data.patch, `agentd-cloud:${props.id}`, {}, resolve);
  if (renderable === null) {
    return (
      <p className="text-muted-foreground text-sm">
        <T>This branch has no changes against the default branch.</T>
      </p>
    );
  }
  const items: CodeViewDiffItem<undefined>[] =
    renderable.kind === "files"
      ? renderable.files.map((fileDiff) => ({
          id: resolveFileDiffPath(fileDiff),
          type: "diff" as const,
          fileDiff,
        }))
      : [];
  return (
    <div className="space-y-2">
      {data.truncated ? (
        <p className="text-muted-foreground text-sm">
          <T>The branch changes too much to show here; only the first files are shown.</T>
        </p>
      ) : null}
      {renderable.kind === "raw" ? (
        <>
          <p className="text-muted-foreground text-sm">{renderable.reason}</p>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/40 p-2 text-xs">
            {renderable.text}
          </pre>
        </>
      ) : (
        <div className="h-[60vh] min-h-0 overflow-hidden rounded-md border border-border">
          <StyledDiffCodeView
            className="h-full overflow-auto"
            items={items}
            options={{
              diffStyle: diffLayout === "split" ? "split" : "unified",
              lineDiffType: "none",
              overflow: wordWrap ? "wrap" : "scroll",
              theme: resolveDiffThemeName(appearance),
              preferredHighlighter: PREFERRED_HIGHLIGHTER,
              themeType: appearance,
              stickyHeaders: true,
            }}
          />
        </div>
      )}
    </div>
  );
}

function OpenPullRequest({
  url,
  number,
}: {
  readonly url: string;
  readonly number: number | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const label =
    number === null ? (
      <T>Open pull request</T>
    ) : (
      <T>
        Open pull request #<Var>{number}</Var>
      </T>
    );
  // The desktop opens it in the system browser; the web build follows the link.
  const open = isElectron
    ? (event: MouseEvent) => {
        event.preventDefault();
        setError(null);
        ensureLocalApi()
          .shell.openExternal(url)
          .catch((cause: unknown) =>
            setError(cause instanceof Error ? cause.message : String(cause)),
          );
      }
    : undefined;
  return (
    <>
      <Button
        size="xs"
        variant="outline"
        render={<a href={url} target="_blank" rel="noopener noreferrer" />}
        onClick={open}
      >
        {label}
        <ExternalLinkIcon aria-hidden />
      </Button>
      {error ? (
        <span role="alert" className="wrap-anywhere text-destructive text-xs">
          {error}
        </span>
      ) : null}
    </>
  );
}

/**
 * Review changes and Open pull request for a finished cloud task with a pushed branch. Review needs
 * a git checkout of the task's repository in this environment; the app pushes and merges nothing.
 */
export function CloudTaskReviewActions(props: {
  readonly row: AgentdTaskRow;
  readonly task: AgentdTask | null;
  readonly environmentId: EnvironmentId;
}) {
  const { row, task, environmentId } = props;
  const gt = useGT();
  const projects = useProjects();
  const [reviewing, setReviewing] = useState(false);
  const branch = task?.branch ?? null;
  const finished = task?.cloud?.state === "completed" && branch !== null;
  const checkout = finished
    ? cloudReviewCheckout(projects, environmentId, task.project ?? row.project)
    : null;
  const pullRequest = finished ? (task.cloud?.pullRequest ?? null) : null;
  if (checkout === null && pullRequest === null) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {checkout !== null ? (
        <Button size="xs" variant="outline" onClick={() => setReviewing(true)}>
          <T>Review changes</T>
        </Button>
      ) : null}
      {pullRequest !== null ? (
        <OpenPullRequest url={pullRequest.url} number={pullRequest.number} />
      ) : null}
      {reviewing && checkout !== null && task !== null ? (
        <Dialog open onOpenChange={(open) => setReviewing(open)}>
          <DialogPopup className="sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                <T>Review changes</T>
              </DialogTitle>
              <DialogDescription>
                {gt("Branch {branch} against the default branch, compared in {checkout}.", {
                  branch: branch ?? "",
                  checkout,
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogPanel scrollFade={false}>
              <CloudBranchDiff id={task.id} cwd={checkout} environmentId={environmentId} />
            </DialogPanel>
          </DialogPopup>
        </Dialog>
      ) : null}
    </div>
  );
}
