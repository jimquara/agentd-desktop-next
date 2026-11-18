import type { AgentdTaskRow } from "@t3tools/contracts";
import { T } from "gt-react";
import { ArrowUpRightIcon } from "lucide-react";

import type { useAgentdPeople, useAgentdTasks } from "../../lib/agentdState";
import { usePrimaryEnvironmentId } from "../../state/environments";
import { Badge } from "../ui/badge";
import {
  AgentdCloudTaskSummary,
  StopTaskButton,
  useAgentdTaskDetails,
} from "./AgentdBackgroundTaskRow";
import { groupWorkerActivity } from "./AgentdPage.logic";
import { AgentdLoading, AgentdReadError, AgentdTimestamp } from "./AgentdPageReads";
import { isFinishedAgentdTask } from "./backgroundTasks.logic";

function AgentdWorkerTask({
  task,
  open,
  showWorker = false,
}: {
  task: AgentdTaskRow;
  open: (task: AgentdTaskRow) => void;
  showWorker?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-md p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      onClick={() => open(task)}
    >
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block break-words font-medium">{task.title || task.id}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showWorker && task.workerName ? (
            <span className="break-all">{task.workerName}</span>
          ) : null}
          {task.workerTool ? <span>{task.workerTool}</span> : null}
          {task.updated ? <AgentdTimestamp value={task.updated} /> : null}
        </span>
      </span>
      <Badge variant="secondary">
        {task.workerState ?? (task.workerRunning ? <T>Running</T> : task.state)}
      </Badge>
      <ArrowUpRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function AgentdCloudWorkerTask({
  row,
  open,
}: {
  readonly row: AgentdTaskRow;
  readonly open: (task: AgentdTaskRow) => void;
}) {
  const environmentId = usePrimaryEnvironmentId();
  const { task, error } = useAgentdTaskDetails(row, environmentId);
  const title = row.title || row.id;
  return (
    <li className="flex items-start gap-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={() => open(row)}
      >
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block break-words font-medium">{title}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <AgentdCloudTaskSummary row={row} task={task} />
          </span>
          {task?.note || error ? (
            <span className="block break-words text-xs">{task?.note ?? error}</span>
          ) : null}
        </span>
        <ArrowUpRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      {environmentId !== null && !isFinishedAgentdTask(row.state) ? (
        <StopTaskButton id={row.id} title={title} environmentId={environmentId} />
      ) : null}
    </li>
  );
}

export function AgentdPageWorkers({
  tasks,
  people,
  open,
}: {
  tasks: ReturnType<typeof useAgentdTasks>;
  people: ReturnType<typeof useAgentdPeople>;
  open: (task: AgentdTaskRow) => void;
}) {
  const activity = groupWorkerActivity(tasks.data ?? [], people.data?.nodes ?? []);
  const cloudTasks = tasks.data?.filter((task) => task.runsOn === "cloud") ?? [];
  return (
    <div className="space-y-4 text-sm">
      {tasks.error !== null ? <AgentdReadError error={tasks.error} /> : null}
      {people.error !== null ? <AgentdReadError error={people.error} /> : null}
      {(tasks.data === null && tasks.error === null) ||
      (people.data === null && people.error === null) ? (
        <AgentdLoading />
      ) : null}
      {activity.local.length > 0 ? (
        <div className="space-y-1">
          <h3 className="font-medium">
            <T>This machine</T>
          </h3>
          <ul>
            {activity.local.map((task) => (
              <li key={task.id}>
                <AgentdWorkerTask task={task} open={open} showWorker />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {activity.team.length > 0 ? (
        <div className="space-y-1">
          <h3 className="font-medium">
            <T>Team nodes</T>
          </h3>
          <ul className="divide-y divide-border">
            {activity.team.map(({ name, node, tasks: nodeTasks }) => (
              <li key={name ?? ""} className="space-y-1 py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="break-all font-medium">{name ?? <T>Unknown node</T>}</span>
                  {node ? (
                    <>
                      {node.host && node.host !== name ? (
                        <span className="break-all text-muted-foreground">{node.host}</span>
                      ) : null}
                      {node.person ? (
                        <span className="break-all text-muted-foreground">{node.person}</span>
                      ) : null}
                      <Badge variant="secondary">
                        {node.offline ? <T>Offline</T> : node.state}
                      </Badge>
                    </>
                  ) : null}
                </div>
                {node?.seen ? (
                  <p className="text-xs text-muted-foreground">
                    <AgentdTimestamp value={node.seen} />
                  </p>
                ) : null}
                {node?.why ? (
                  <p className="break-words text-xs text-muted-foreground">{node.why}</p>
                ) : null}
                {nodeTasks.length > 0 ? (
                  <ul>
                    {nodeTasks.map((task) => (
                      <li key={task.id}>
                        <AgentdWorkerTask task={task} open={open} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <T>No task reported.</T>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {cloudTasks.length > 0 ? (
        <div className="space-y-1">
          <h3 className="font-medium">
            <T>Cloud Workers</T>
          </h3>
          <ul>
            {cloudTasks.map((task) => (
              <AgentdCloudWorkerTask key={task.id} row={task} open={open} />
            ))}
          </ul>
        </div>
      ) : null}
      {tasks.data !== null &&
      people.data !== null &&
      activity.local.length + activity.team.length + cloudTasks.length === 0 ? (
        <p className="text-muted-foreground">
          <T>No active workers or team nodes reported.</T>
        </p>
      ) : null}
    </div>
  );
}
