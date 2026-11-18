import { useAtomValue } from "@effect/atom-react";
import type { AgentdRunsOn, AgentdTask, AgentdTaskRow, EnvironmentId } from "@t3tools/contracts";
import { formatDuration } from "@t3tools/shared/orchestrationTimingCopy";
import { T, useGT, useLocale, useMessages, Var } from "gt-react";
import { useEffect, useRef, useState } from "react";

import { requestConfirmDialog } from "../../confirmDialog";
import { agentdEnvironment, useAgentdCommands, useAgentdTask } from "../../lib/agentdState";
import { tickTextContent } from "../../lib/tickTextContent";
import { formatEnvironmentQueryError } from "../../state/query";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { AgentdTaskOutput } from "./AgentdTaskOutput";
import { BackgroundTaskCard } from "./BackgroundTaskCard";
import { finishedAgentdTaskLabel, runningAgentdTaskLabel } from "./backgroundTasks.logic";

function AgentdTaskLocation({ location }: { readonly location: AgentdRunsOn }) {
  switch (location) {
    case "local":
      return <T>Local worker</T>;
    case "team":
      return <T>Team node</T>;
    case "cloud":
      return <T>Cloud Worker</T>;
  }
}

function workerName(tool: string | null): string | null {
  switch (tool) {
    case "claude":
      return "Claude Code";
    case "codex":
      return "Codex";
    case "opencode":
      return "opencode";
    default:
      return tool;
  }
}

function TaskDuration(props: {
  readonly started: string | null;
  readonly ended: string | null;
  readonly live: boolean;
}) {
  const resolve = useMessages();
  const started = Date.parse(props.started ?? "");
  const ended = Date.parse(props.ended ?? "");
  if (!Number.isFinite(started) || (!props.live && !Number.isFinite(ended))) {
    return (
      <span>
        <T>Duration unavailable</T>
      </span>
    );
  }
  const format = (now: number) => formatDuration(Math.max(0, now - started), resolve);
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="tabular-nums" />}>
        {props.live ? <span ref={tickTextContent(format, true)} /> : format(ended)}
      </TooltipTrigger>
      <TooltipPopup>
        {props.live ? (
          <T>Time since the task was created</T>
        ) : (
          <T>Time from task creation to last update</T>
        )}
      </TooltipPopup>
    </Tooltip>
  );
}

function TaskCost({ task }: { readonly task: AgentdTask }) {
  const locale = useLocale();
  if (task.costUsd === null) return <T>Cost unavailable</T>;
  const cost = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(task.costUsd);
  return task.costEstimate ? (
    <T>
      Estimated cost: <Var>{cost}</Var>
    </T>
  ) : (
    <T>
      Cost: <Var>{cost}</Var>
    </T>
  );
}

function FinishedTaskDetails({ task }: { readonly task: AgentdTask }) {
  return (
    <dl className="space-y-2 wrap-anywhere select-text">
      <div>
        <dt className="font-medium">
          <T>Check result</T>
        </dt>
        <dd className="whitespace-pre-wrap text-muted-foreground">
          {task.verdict?.check ?? <T>No check result was recorded.</T>}
        </dd>
      </div>
      <div>
        <dt className="font-medium">
          <T>Next step</T>
        </dt>
        <dd className="whitespace-pre-wrap text-muted-foreground">
          {task.verdict?.next ?? <T>No next step was recorded.</T>}
        </dd>
      </div>
    </dl>
  );
}

function StopTaskButton(props: {
  readonly id: string;
  readonly title: string;
  readonly environmentId: EnvironmentId;
}) {
  const { environmentId, id, title } = props;
  const gt = useGT();
  const resolve = useMessages();
  const canStop = useAtomValue(agentdEnvironment.stopTask.permissionAtom(environmentId));
  const { stopTask } = useAgentdCommands();
  const [status, setStatus] = useState<"idle" | "pending" | "requested">("idle");
  const [error, setError] = useState<string | null>(null);
  if (!canStop) return null;

  const stop = async () => {
    setStatus("pending");
    setError(null);
    const confirmed = await requestConfirmDialog(
      gt("Stop this background task?\n{title}", { title }),
      { variant: "destructive" },
    );
    if (confirmed !== true) {
      setStatus("idle");
      return;
    }
    const result = await stopTask({
      environmentId,
      input: { id, reason: "Stopped from AgentD Desktop" },
    });
    if (result._tag === "Failure") {
      setError(formatEnvironmentQueryError(result.cause, resolve));
      setStatus("idle");
      return;
    }
    setStatus("requested");
  };

  return (
    <>
      <Button size="xs" variant="ghost-destructive" disabled={status !== "idle"} onClick={stop}>
        {status === "requested" ? <T>Stop requested</T> : <T>Stop</T>}
      </Button>
      {error ? (
        <p className="max-w-32 wrap-anywhere text-xs text-destructive" role="alert">
          <T>
            Couldn&apos;t stop task: <Var>{error}</Var>
          </T>
        </p>
      ) : null}
    </>
  );
}

export function AgentdBackgroundTaskRow(props: {
  readonly row: AgentdTaskRow;
  readonly environmentId: EnvironmentId;
  readonly finished: boolean;
}) {
  const { row, environmentId, finished } = props;
  const gt = useGT();
  const resolve = useMessages();
  const { data, error, refresh } = useAgentdTask(row.id, environmentId);
  const task = data?.state === row.state ? data : null;
  const snapshot = JSON.stringify([row.state, row.updated, row.workerState, row.workerRunning]);
  const lastSnapshot = useRef(data !== null && task === null ? null : snapshot);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- refresh bridge-only fields when the live list changes for this task
  useEffect(() => {
    if (lastSnapshot.current === snapshot) return;
    lastSnapshot.current = snapshot;
    refresh();
  }, [refresh, snapshot]);

  const title = task?.goal?.trim() || row.title || gt("Untitled task");
  const worker = workerName(task?.workerTool ?? row.workerTool);
  const location = task?.runsOn ?? (row.runsOn === "cloud" ? row.runsOn : null);
  return (
    <BackgroundTaskCard
      title={title}
      summary={
        <>
          <span className="font-medium text-foreground">
            {finished
              ? finishedAgentdTaskLabel(row.state, task?.verdict ?? null, resolve)
              : runningAgentdTaskLabel(row, task?.budgetState ?? null, resolve)}
          </span>
          {!finished ? <span>{worker ?? <T>Agent unknown</T>}</span> : null}
          {location === null ? null : (
            <span>
              <AgentdTaskLocation location={location} />
            </span>
          )}
          {task !== null || error !== null ? (
            <TaskDuration
              started={task?.started ?? null}
              ended={task?.updated ?? null}
              live={!finished}
            />
          ) : null}
          {finished && task ? (
            <>
              <span className="min-w-0 wrap-anywhere">
                {task.branch ? (
                  <T>
                    Branch: <Var>{task.branch}</Var>
                  </T>
                ) : (
                  <T>Branch unavailable</T>
                )}
              </span>
              <span>
                <TaskCost task={task} />
              </span>
            </>
          ) : null}
        </>
      }
      action={
        finished ? null : <StopTaskButton id={row.id} title={title} environmentId={environmentId} />
      }
    >
      {error ? (
        <p className="text-destructive" role="alert">
          <T>
            Couldn&apos;t load task details: <Var>{error}</Var>
          </T>
        </p>
      ) : null}
      {finished ? (
        task ? (
          <FinishedTaskDetails task={task} />
        ) : error === null ? (
          <T>Loading task details…</T>
        ) : null
      ) : (
        <AgentdTaskOutput
          id={task?.hasLog === false ? null : row.id}
          environmentId={environmentId}
        />
      )}
    </BackgroundTaskCard>
  );
}
