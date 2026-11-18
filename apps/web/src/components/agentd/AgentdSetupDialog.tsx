import { useAtomValue } from "@effect/atom-react";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { AgentdSetupState, EnvironmentId } from "@t3tools/contracts";
import { Atom } from "effect/reactivity";
import { T, useGT, Var } from "gt-react";
import { useEffect, useState } from "react";

import {
  agentdEnvironment,
  useAgentdEula,
  useAgentdSetup,
  useAgentdStatus,
} from "~/lib/agentdState";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { usePrimaryEnvironmentId } from "~/state/environments";
import { useAtomCommand } from "~/state/use-atom-command";
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

const EULA_URL = "https://libraos.com/eula";

// The environment the person opened the dialog for, and those they answered Not now for, this run.
const openedFor = Atom.make<EnvironmentId | null>(null).pipe(
  Atom.keepAlive,
  Atom.withLabel("agentd:setup-dialog"),
);
const notNow = Atom.make<Readonly<Record<EnvironmentId, true>>>({}).pipe(
  Atom.keepAlive,
  Atom.withLabel("agentd:setup-not-now"),
);

/** Opens Set up AgentD for an environment, as the AgentD page's not-set-up message does. */
export function openAgentdSetupDialog(environmentId: EnvironmentId) {
  appAtomRegistry.set(openedFor, environmentId);
}

export function useCanSetUpAgentd(environmentId: EnvironmentId | null) {
  return useAtomValue(agentdEnvironment.setupStart.permissionAtom(environmentId));
}

function closeDialog(environmentId: EnvironmentId) {
  appAtomRegistry.set(openedFor, null);
  appAtomRegistry.set(notNow, { ...appAtomRegistry.get(notNow), [environmentId]: true });
}

/**
 * Where the app opens: shows the dialog by itself when the primary environment's agentd says it
 * is not set up, until Not now; and whenever the AgentD page asks for it.
 */
export function AgentdSetupDialogHost() {
  const opened = useAtomValue(openedFor);
  const dismissed = useAtomValue(notNow);
  const primary = usePrimaryEnvironmentId();
  const status = useAgentdStatus(primary);
  const canSetUp = useCanSetUpAgentd(primary);
  const automatic =
    primary !== null && status.data?.setUp === false && canSetUp && dismissed[primary] !== true
      ? primary
      : null;
  const environmentId = opened ?? automatic;
  return environmentId === null ? null : (
    <AgentdSetupDialog key={environmentId} environmentId={environmentId} />
  );
}

function AgentdSetupDialog({ environmentId }: { readonly environmentId: EnvironmentId }) {
  const gt = useGT();
  const eula = useAgentdEula(environmentId);
  const setup = useAgentdSetup(environmentId);
  const status = useAgentdStatus(environmentId);
  const canSetUp = useCanSetUpAgentd(environmentId);
  const startSetup = useAtomCommand(agentdEnvironment.setupStart, { reportFailure: false });
  // The run this dialog's Accept started; "starting" until the server names it.
  const [attempt, setAttempt] = useState<number | "starting" | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const run = setup.data;
  const ours = run !== null && run.attempt === attempt ? run : null;
  // A run another client started is shown too; an old finished one only if it failed.
  const shown: AgentdSetupState | null =
    ours ?? (run !== null && (run.phase === "running" || run.phase === "failed") ? run : null);
  const running = attempt === "starting" || shown?.phase === "running";
  const finished = ours?.phase === "succeeded" || ours?.phase === "failed";
  const succeeded = ours?.phase === "succeeded";
  const refreshStatus = status.refresh;

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- re-reads agentd's status once the server's init run ends, and closes after a success
  useEffect(() => {
    if (!finished) return;
    refreshStatus();
    if (succeeded) closeDialog(environmentId);
  }, [finished, succeeded, refreshStatus, environmentId]);

  const accept = async () => {
    // From here the dialog stays until the person closes it, whatever the status says.
    appAtomRegistry.set(openedFor, environmentId);
    setAttempt("starting");
    setStartError(null);
    const result = await startSetup({ environmentId, input: {} });
    if (result._tag === "Success") {
      setAttempt(result.value.attempt);
    } else {
      const failure = squashAtomCommandFailure(result);
      setAttempt(null);
      setStartError(
        failure instanceof Error && failure.message
          ? failure.message
          : gt("AgentD could not start agentd init."),
      );
    }
  };

  const stoppedReason =
    shown?.stopped === "prompt"
      ? gt(
          "agentd init asked a question this app does not answer, so it was stopped. Run agentd init in a terminal to answer it.",
        )
      : shown?.stopped === "timeout"
        ? gt("agentd init took longer than 10 minutes and was stopped.")
        : shown?.stopped === "spawn"
          ? gt("agentd init could not be started.")
          : shown?.phase === "failed"
            ? gt("agentd init did not finish (exit code {code}). What it said is above.", {
                code: String(shown.exitCode ?? "?"),
              })
            : null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !running) closeDialog(environmentId);
      }}
    >
      <DialogPopup showCloseButton={!running} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <T>Set up AgentD</T>
          </DialogTitle>
          <DialogDescription>
            <T>
              AgentD runs tasks and workers for your agents. To set it up, accept its End User
              Agreement: Accept runs <code>agentd init</code> on this environment, which records
              your acceptance and sets agentd up. Chat and code work without it.
            </T>
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-3">
            {shown === null ? (
              <>
                <p className="font-medium text-sm">
                  {eula.data?.version ? (
                    <T>
                      AgentD End User Agreement, version <Var>{eula.data.version}</Var>
                    </T>
                  ) : (
                    <T>AgentD End User Agreement</T>
                  )}
                </p>
                {eula.error ? (
                  <p role="alert" className="text-destructive text-sm">
                    <T>
                      Couldn&apos;t read the agreement from agentd: <Var>{eula.error}</Var>
                    </T>
                  </p>
                ) : (
                  <div
                    role="document"
                    aria-label={gt("AgentD End User Agreement")}
                    tabIndex={0}
                    className="max-h-72 overflow-y-auto rounded-lg border border-border p-3"
                  >
                    <pre className="wrap-anywhere whitespace-pre-wrap font-sans text-xs">
                      {eula.data?.text ?? gt("Loading…")}
                    </pre>
                  </div>
                )}
                <p className="text-muted-foreground text-sm">
                  <T>
                    Also at{" "}
                    <a
                      className="underline"
                      href={EULA_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      libraos.com/eula
                    </a>
                    .
                  </T>
                </p>
                {!canSetUp && (
                  <p className="text-muted-foreground text-sm">
                    <T>This connection cannot set up AgentD on this environment.</T>
                  </p>
                )}
              </>
            ) : (
              <>
                <p role="status" className="font-medium text-sm">
                  {running ? <T>Setting up AgentD…</T> : <T>agentd init stopped</T>}
                </p>
                <div
                  role="log"
                  aria-label={gt("agentd init output")}
                  className="max-h-72 overflow-y-auto rounded-lg border border-border p-3"
                >
                  <pre className="wrap-anywhere whitespace-pre-wrap font-mono text-xs">
                    {shown.output === "" ? gt("Starting agentd init…") : shown.output}
                  </pre>
                </div>
                {stoppedReason !== null && (
                  <p role="alert" className="text-destructive text-sm">
                    {stoppedReason}
                  </p>
                )}
              </>
            )}
            {startError !== null && (
              <p role="alert" className="wrap-anywhere text-destructive text-sm">
                {startError}
              </p>
            )}
          </div>
        </DialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={running}
            onClick={() => closeDialog(environmentId)}
          >
            {shown?.phase === "failed" ? <T>Close</T> : <T>Not now</T>}
          </Button>
          <Button
            type="button"
            disabled={running || !canSetUp || (shown === null && eula.data === null)}
            onClick={() => void accept()}
          >
            {running ? (
              <T>Setting up…</T>
            ) : shown?.phase === "failed" ? (
              <T>Try again</T>
            ) : (
              <T>Accept and set up</T>
            )}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
