import { useAtomValue } from "@effect/atom-react";
import { scopeProjectRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { threadRuntimeIsActive } from "@t3tools/client-runtime/state/shell";
import type {
  AgentdWorkerTool,
  EnvironmentId,
  MessageId,
  ScopedThreadRef,
} from "@t3tools/contracts";
import { Atom } from "effect/reactivity";
import { T, useGT } from "gt-react";
import { useId, useRef, useState } from "react";

import { revealCodeMode } from "~/chatCodeModeStore";
import { agentdEnvironment, useAgentdStatus } from "~/lib/agentdState";
import { newMessageId } from "~/lib/utils";
import { rightPanelHostRef, useRightPanelStore } from "~/rightPanelStore";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { useProject, useQuietThreadShell, useThreadProjection } from "~/state/entities";
import { useEnvironmentQuery } from "~/state/query";
import { threadEnvironment } from "~/state/threads";
import { useAtomCommand } from "~/state/use-atom-command";
import { useOrchestrationCommand } from "~/state/use-orchestration-command";
import { vcsEnvironment } from "~/state/vcs";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { toastManager } from "../ui/toast";
import { CloudWorkersSetupLink, StartTaskCloud, useStartTaskCloud } from "./StartTaskCloud";
import { StartTaskOthers } from "./StartTaskOthers";
import {
  conversationTaskDraft,
  EMPTY_TASK_FIELDS,
  prepareTaskFields,
  TASK_ACCEPT_LIMIT,
  TASK_BUDGET_LIMIT,
  TASK_DRAFT_PROMPT,
  TASK_ISSUE_LIMIT,
  TASK_TEXT_LIMIT,
  TASK_WORKERS,
  taskBranchProblem,
  type TaskFields,
} from "./startTask.logic";

const dialogThread = Atom.make<ScopedThreadRef | null>(null).pipe(
  Atom.keepAlive,
  Atom.withLabel("agentd:start-task-dialog"),
);

export function openStartTaskDialog(threadRef: ScopedThreadRef) {
  appAtomRegistry.set(dialogThread, threadRef);
}

export function useCanStartTask(environmentId: EnvironmentId | null) {
  return useAtomValue(agentdEnvironment.startTask.permissionAtom(environmentId));
}

export function StartTaskDialogHost() {
  const threadRef = useAtomValue(dialogThread);
  return threadRef === null ? null : (
    <StartTaskDialog
      key={scopedThreadKey(threadRef)}
      threadRef={threadRef}
      onClose={() => appAtomRegistry.set(dialogThread, null)}
    />
  );
}

function TaskField({
  label,
  id,
  reason,
  children,
}: {
  readonly label: string;
  readonly id: string;
  readonly reason?: string | null;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {reason && (
        <p id={`${id}-reason`} className="text-muted-foreground text-xs">
          {reason}
        </p>
      )}
    </div>
  );
}

function StartTaskDialog({
  threadRef,
  onClose,
}: {
  readonly threadRef: ScopedThreadRef;
  readonly onClose: () => void;
}) {
  const gt = useGT();
  const id = useId();
  const { environmentId, threadId } = threadRef;
  const thread = useQuietThreadShell(threadRef);
  const project = useProject(thread ? scopeProjectRef(environmentId, thread.projectId) : null);
  const cwd = thread?.worktreePath ?? project?.workspaceRoot ?? null;
  const cloud = useStartTaskCloud(cwd, environmentId);
  const canStart = useCanStartTask(environmentId);
  const status = useAgentdStatus(environmentId);
  const git = useEnvironmentQuery(
    cwd === null ? null : vcsEnvironment.status({ environmentId, input: { cwd } }),
  );
  const refreshBranch = useAtomCommand(vcsEnvironment.refreshLocalStatusForPicker, {
    reportFailure: false,
  });
  const startTask = useAtomCommand(agentdEnvironment.startTask, { reportFailure: false });
  const startTurn = useOrchestrationCommand(threadEnvironment.startTurn, { reportFailure: false });
  const [editedFields, setEditedFields] = useState<TaskFields | null>(null);
  const [draft, setDraft] = useState<{ messageId: MessageId; previous: TaskFields } | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [offeredId, setOfferedId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const projection = useThreadProjection(draft === null ? null : threadRef)?.projection;
  const reply = draft === null ? null : conversationTaskDraft(projection, draft.messageId);
  const drafting = reply?.kind === "waiting";
  const fields =
    editedFields ?? (reply?.kind === "ready" ? reply.fields : draft?.previous) ?? EMPTY_TASK_FIELDS;
  const validation = prepareTaskFields(fields);
  const worker = fields.worker ?? status.data?.defaultWorker ?? null;
  const branchReason = (problem: ReturnType<typeof taskBranchProblem>, branch: string | null) => {
    switch (problem) {
      case "not-repo":
        return gt("The working directory is not a Git repository.");
      case "detached":
        return gt("Check out a named branch in this working directory first.");
      case "protected":
        return gt("The working directory is on {branch}. Switch to a different branch first.", {
          branch: branch ?? "",
        });
      case null:
        return null;
    }
  };
  const directoryReason =
    cwd === null
      ? gt("This session has no project working directory.")
      : (git.error ??
        (git.data === null
          ? gt("Checking the working directory’s Git branch…")
          : branchReason(taskBranchProblem(git.data), git.data.refName)));
  const workerReason =
    worker !== null ? null : gt("Choose a worker. The default is set in agentd.");
  const goalReason =
    validation.goal === "required"
      ? gt("Enter a goal.")
      : validation.goal === "invalid"
        ? gt("Enter a goal that does not begin with a dash or contain a NUL character.")
        : null;
  const checkReason =
    validation.check === "required" && !cloud.enabled
      ? gt("Enter a check command.")
      : validation.check === "invalid"
        ? gt("Enter a check command that does not begin with a dash or contain a NUL character.")
        : null;
  const budgetReason =
    validation.budget === "required"
      ? gt("Enter a budget.")
      : validation.budget === "invalid"
        ? gt("Enter a positive budget such as 30m, $2, or 30m,$2.")
        : null;
  const acceptReason = validation.accept
    ? gt(
        "Use at most {limit} acceptance criteria, one per line, with no leading dashes or NUL characters.",
        { limit: TASK_ACCEPT_LIMIT },
      )
    : null;
  const issueReason = validation.issue ? gt("Use the format OWNER/REPO#123.") : null;
  const disabled =
    starting ||
    drafting ||
    offeredId !== null ||
    !canStart ||
    (cloud.enabled
      ? cloud.input === null
      : directoryReason !== null ||
        worker === null ||
        budgetReason !== null ||
        issueReason !== null) ||
    goalReason !== null ||
    checkReason !== null ||
    acceptReason !== null;
  const draftDisabled =
    thread === null ||
    threadRuntimeIsActive(thread.runtime) ||
    thread.hasPendingApprovals ||
    thread.hasPendingUserInput ||
    !canStart;

  function showFailure(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  async function requestDraft() {
    if (draftDisabled || drafting || starting || offeredId !== null || thread === null) return;
    const messageId = newMessageId();
    setDraftError(null);
    setEditedFields(null);
    setDraft({ messageId, previous: fields });
    const result = await startTurn({
      environmentId,
      input: {
        threadId,
        message: { messageId, role: "user", text: TASK_DRAFT_PROMPT, attachments: [] },
        modelSelection: thread.modelSelection,
        runtimeMode: thread.runtimeMode,
        interactionMode: "default",
        dispatchMode: "start",
        createdAt: new Date().toISOString(),
      },
    });
    if (result._tag === "Failure") {
      setDraft(null);
      setEditedFields(fields);
      setDraftError(
        showFailure(
          squashAtomCommandFailure(result),
          gt("Could not ask the session’s agent for a draft."),
        ),
      );
    }
  }

  async function startCheckedTask(cwd: string, worker: AgentdWorkerTool | null) {
    const panelRef = rightPanelHostRef(threadRef);
    if (!cloud.enabled) {
      const current = await refreshBranch({ environmentId, input: { cwd, localOnly: true } });
      if (current._tag === "Failure") {
        setStartError(
          showFailure(
            squashAtomCommandFailure(current),
            gt("Could not check the working directory’s Git branch."),
          ),
        );
        return;
      }
      const reason = branchReason(taskBranchProblem(current.value), current.value.refName);
      if (reason !== null) {
        setStartError(reason);
        return;
      }
    }
    const { goal, accept, check } = validation.input;
    const input = cloud.enabled
      ? cloud.input && { goal, accept, check: check || null, cwd, cloud: cloud.input }
      : worker !== null && { ...validation.input, cwd, worker };
    if (!input) return;
    const result = await startTask({
      environmentId,
      input,
    });
    if (result._tag === "Failure") {
      setStartError(
        showFailure(squashAtomCommandFailure(result), gt("AgentD could not start the task.")),
      );
      return;
    }
    const task = result.value;
    if (!task.started) {
      setOfferedId(task.id);
      setStartError(task.note ?? gt("AgentD did not dispatch the task."));
      return;
    }
    revealCodeMode(scopedThreadKey(panelRef));
    useRightPanelStore.getState().open(panelRef, "background-tasks");
    toastManager.add({
      type: "success",
      title: gt("Started task {taskId}.", { taskId: task.id }),
    });
    onClose();
  }

  function submit() {
    if (disabled || startingRef.current || cwd === null) return;
    startingRef.current = true;
    setStarting(true);
    setStartError(null);
    void startCheckedTask(cwd, worker)
      .catch((error: unknown) => {
        setStartError(showFailure(error, gt("AgentD could not start the task.")));
      })
      .finally(() => {
        startingRef.current = false;
        setStarting(false);
      });
  }

  function fieldProps(field: keyof TaskFields, reason: string | null) {
    const fieldId = `${id}-${field}`;
    return {
      id: fieldId,
      "aria-describedby": reason ? `${fieldId}-reason` : undefined,
      disabled: starting || drafting || offeredId !== null,
    };
  }
  function updateField<Field extends keyof TaskFields>(field: Field, value: TaskFields[Field]) {
    setEditedFields({ ...fields, [field]: value });
  }
  const goalProps = fieldProps("goal", goalReason);
  const acceptProps = fieldProps("accept", acceptReason);
  const checkProps = fieldProps("check", checkReason);
  const workerProps = fieldProps("worker", workerReason);
  const budgetProps = fieldProps("budget", budgetReason);
  const issueProps = fieldProps("issue", issueReason);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !startingRef.current) onClose();
      }}
    >
      <DialogPopup showCloseButton={!starting}>
        <DialogHeader>
          <DialogTitle>
            <T>Hand to a worker</T>
          </DialogTitle>
          <DialogDescription>
            <T>Review the task and its budget before starting a worker on your account.</T>
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <Button
            type="button"
            variant="outline"
            disabled={draftDisabled || drafting || starting || offeredId !== null}
            onClick={() => void requestDraft()}
          >
            {drafting ? (
              <T>Waiting for the session’s agent…</T>
            ) : (
              <T>Draft from this conversation</T>
            )}
          </Button>
          {draftError !== null || reply?.kind === "failed" ? (
            <p role="status" className="text-muted-foreground text-sm">
              {draftError ??
                gt(
                  "The session’s agent did not return a usable draft. You can still fill in the form.",
                )}
            </p>
          ) : null}
          <TaskField label={gt("Goal")} id={goalProps.id} reason={goalReason}>
            <Textarea
              {...goalProps}
              rows={2}
              maxLength={TASK_TEXT_LIMIT}
              value={fields.goal}
              onChange={(event) => updateField("goal", event.target.value)}
            />
          </TaskField>
          <TaskField
            label={gt("Acceptance criteria (one per line)")}
            id={acceptProps.id}
            reason={acceptReason}
          >
            <Textarea
              {...acceptProps}
              rows={2}
              maxLength={TASK_TEXT_LIMIT}
              value={fields.accept}
              onChange={(event) => updateField("accept", event.target.value)}
            />
          </TaskField>
          <TaskField
            label={cloud.enabled ? gt("Check command (optional)") : gt("Check command")}
            id={checkProps.id}
            reason={
              checkReason ??
              (cloud.enabled && !validation.input.check
                ? gt("Without a check command, you’ll need to accept the result yourself.")
                : null)
            }
          >
            <Input
              {...checkProps}
              maxLength={TASK_TEXT_LIMIT}
              value={fields.check}
              onChange={(event) => updateField("check", event.target.value)}
            />
          </TaskField>
          <StartTaskCloud
            cloud={cloud}
            disabled={starting || drafting || offeredId !== null || !canStart}
          />
          {!cloud.enabled ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TaskField label={gt("Worker")} id={workerProps.id} reason={workerReason}>
                <Select
                  value={worker}
                  items={TASK_WORKERS}
                  disabled={workerProps.disabled}
                  onValueChange={(value) => updateField("worker", value)}
                >
                  <SelectTrigger
                    id={workerProps.id}
                    aria-describedby={workerProps["aria-describedby"]}
                  >
                    <SelectValue placeholder={gt("Choose a worker")} />
                  </SelectTrigger>
                  <SelectPopup>
                    {Object.entries(TASK_WORKERS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </TaskField>
              <TaskField label={gt("Budget")} id={budgetProps.id} reason={budgetReason}>
                <Input
                  {...budgetProps}
                  maxLength={TASK_BUDGET_LIMIT}
                  placeholder="30m,$2"
                  value={fields.budget}
                  onChange={(event) => updateField("budget", event.target.value)}
                />
              </TaskField>
            </div>
          ) : null}
          <TaskField
            label={gt("Working directory")}
            id={`${id}-cwd`}
            reason={cloud.enabled ? null : directoryReason}
          >
            <Input
              id={`${id}-cwd`}
              aria-describedby={!cloud.enabled && directoryReason ? `${id}-cwd-reason` : undefined}
              readOnly
              value={cwd ?? ""}
            />
          </TaskField>
          {!cloud.enabled ? (
            <TaskField label={gt("Issue (optional)")} id={issueProps.id} reason={issueReason}>
              <Input
                {...issueProps}
                maxLength={TASK_ISSUE_LIMIT}
                placeholder="owner/repo#123"
                value={fields.issue}
                onChange={(event) => updateField("issue", event.target.value)}
              />
            </TaskField>
          ) : null}
          {!canStart && (
            <p className="text-muted-foreground text-sm">
              <T>This connection cannot start AgentD tasks.</T>
            </p>
          )}
          {startError !== null && (
            <div
              role="alert"
              className="space-y-1 rounded-lg border border-destructive/30 p-3 text-sm"
            >
              {offeredId !== null && (
                <p>
                  {cloud.enabled
                    ? gt(
                        "AgentD saved task {taskId}, but it didn’t start in Cloud Workers. Check Background tasks for updates before trying again.",
                        { taskId: offeredId },
                      )
                    : gt("Task {taskId} was offered but did not start.", { taskId: offeredId })}
                </p>
              )}
              <pre className="wrap-anywhere whitespace-pre-wrap">{startError}</pre>
              {cloud.enabled &&
              cloud.setup?.problem !== "setup" &&
              /cloud configuration and account key file/.test(startError) ? (
                <CloudWorkersSetupLink />
              ) : null}
            </div>
          )}
        </DialogPanel>
        <StartTaskOthers
          environmentId={environmentId}
          input={
            cwd !== null && canStart && !drafting && issueReason === null && offeredId === null
              ? { cwd, issue: validation.input.issue }
              : null
          }
        />
        <DialogFooter>
          <Button type="button" variant="outline" disabled={starting} onClick={onClose}>
            {offeredId === null ? <T>Cancel</T> : <T>Close</T>}
          </Button>
          {offeredId === null && (
            <Button type="button" disabled={disabled} onClick={submit}>
              {starting ? <T>Starting…</T> : <T>Start</T>}
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
