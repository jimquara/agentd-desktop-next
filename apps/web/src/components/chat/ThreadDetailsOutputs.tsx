import type { ThreadCheckpointSummary } from "@t3tools/client-runtime/state/thread-checkpoints";
import type { RunId, ScopedThreadRef } from "@t3tools/contracts";
import { T, useGT } from "gt-react";
import { FileDiffIcon } from "lucide-react";

import { useDiffPanelStore } from "../../diffPanelStore";
import { useRightPanelStore } from "../../rightPanelStore";
import { useThreadCheckpointSummaries } from "../../state/entities";
import { ThreadDetailsControl } from "./ThreadDetailsControl";
import { ThreadDetailsSection } from "./ThreadDetailsSection";
import { THREAD_DETAILS_PANEL_ICON_CLASS } from "./threadDetailsPanelStyles";

const MAX_OUTPUT_ROWS = 8;

function collectOutputs(checkpoints: readonly ThreadCheckpointSummary[]) {
  const rows: { runId: RunId; file: ThreadCheckpointSummary["files"][number] }[] = [];
  const seenPaths = new Set<string>();
  const newestFirst = checkpoints.toSorted(
    (left, right) =>
      right.checkpointTurnCount - left.checkpointTurnCount ||
      right.completedAt.localeCompare(left.completedAt),
  );
  let hasMore = false;
  for (const checkpoint of newestFirst) {
    if (checkpoint.status !== "ready") continue;
    if (checkpoint.filesTotal && checkpoint.filesTotal.count > checkpoint.files.length) {
      hasMore = true;
    }
    for (const file of checkpoint.files) {
      if (seenPaths.has(file.path)) continue;
      if (rows.length === MAX_OUTPUT_ROWS) return { rows, hasMore: true };
      seenPaths.add(file.path);
      rows.push({ runId: checkpoint.runId, file });
    }
  }
  return { rows, hasMore };
}

export function ThreadDetailsOutputs({ threadRef }: { readonly threadRef: ScopedThreadRef }) {
  const gt = useGT();
  const checkpoints = useThreadCheckpointSummaries(threadRef);
  const { rows, hasMore } = collectOutputs(checkpoints);
  const latestRunId = rows[0]?.runId;
  const openDiff = (runId: RunId, filePath?: string) => {
    useDiffPanelStore.getState().selectTurn(threadRef, runId, filePath);
    useRightPanelStore.getState().open(threadRef, "diff");
  };

  return (
    <ThreadDetailsSection headingId="thread-details-outputs-heading" title={gt("Outputs")}>
      {rows.length === 0 ? (
        <div className="px-2.5 text-xs text-muted-foreground">
          <T>No file changes recorded</T>
        </div>
      ) : (
        <div data-thread-details-output-list>
          {rows.map(({ runId, file }) => (
            <ThreadDetailsControl
              key={file.path}
              title={file.path}
              aria-label={gt("Open diff for {path}", { path: file.path })}
              onClick={() => openDiff(runId, file.path)}
            >
              <FileDiffIcon className={THREAD_DETAILS_PANEL_ICON_CLASS} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file.path}</span>
              {file.additions > 0 || file.deletions > 0 ? (
                <span className="flex shrink-0 gap-1 text-2xs tabular-nums" aria-hidden>
                  <span className="text-success-foreground">+{file.additions}</span>
                  <span className="text-error-foreground">−{file.deletions}</span>
                </span>
              ) : null}
            </ThreadDetailsControl>
          ))}
          {hasMore && latestRunId !== undefined ? (
            <ThreadDetailsControl tone="muted" onClick={() => openDiff(latestRunId)}>
              <T>Show all</T>
            </ThreadDetailsControl>
          ) : null}
        </div>
      )}
    </ThreadDetailsSection>
  );
}
