import type { ThreadStructure } from "@t3tools/client-runtime/state/shell";
import type { OrchestrationV2PendingBackgroundTask, ScopedThreadRef } from "@t3tools/contracts";
import { T, useGT } from "gt-react";

import { CommandOutputPanel } from "../chat/CommandOutputPanel";
import { ShellCommandBlock } from "../chat/ShellCommandBlock";
import { BackgroundTaskCard } from "./BackgroundTaskCard";

export function SessionBackgroundTaskRow(props: {
  readonly task: OrchestrationV2PendingBackgroundTask;
  readonly threadRef: ScopedThreadRef;
  readonly turnItems: ThreadStructure["turnItems"];
  readonly streamsOutput: boolean;
}) {
  const { task, threadRef, turnItems, streamsOutput } = props;
  const gt = useGT();
  const item = turnItems.findLast((candidate) =>
    task.itemId === undefined
      ? (candidate.nativeItemRef?.nativeId || candidate.id) === task.taskId
      : candidate.id === task.itemId,
  );
  const command = task.command ?? (item?.type === "command_execution" ? item.input : undefined);
  const itemId = task.itemId ?? (item?.type === "command_execution" ? item.id : undefined);
  const live = itemId !== undefined && streamsOutput && item?.status === "running";

  return (
    <BackgroundTaskCard
      title={task.description?.trim() || command || gt("Background work")}
      summary={
        <span>
          <T>This session</T>
        </span>
      }
    >
      {command ? (
        <div className="font-mono wrap-anywhere whitespace-pre-wrap select-text">
          <ShellCommandBlock command={command} />
        </div>
      ) : null}
      {live ? (
        <div className="font-mono wrap-anywhere whitespace-pre-wrap select-text">
          <CommandOutputPanel
            environmentId={threadRef.environmentId}
            threadId={task.sourceThreadId ?? item?.threadId ?? threadRef.threadId}
            itemId={itemId}
          />
        </div>
      ) : (
        <p className="text-muted-foreground">
          <T>No live output is available for this session task.</T>
        </p>
      )}
    </BackgroundTaskCard>
  );
}
