import "~/index.css";

import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import {
  AgentdCommandError,
  type AgentdCloudSetup,
  type AgentdStartTaskResult,
  type AgentdTaskOther,
  ThreadId,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/reactivity";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { hostRightPanel, selectActiveRightPanel, useRightPanelStore } from "~/rightPanelStore";
import { AppAtomRegistryProvider } from "~/rpc/atomRegistry";
import { makeThreadFixture } from "~/test-fixtures";
import { render } from "../../../test/render";
import { ToastProvider } from "../ui/toast";
import { openStartTaskDialog, StartTaskDialogHost } from "./StartTaskDialog";

const state = vi.hoisted(() => ({
  start: vi.fn(),
  refresh: vi.fn(),
  branch: "feature/export",
  cloud: null as AgentdCloudSetup | null,
  others: [] as AgentdTaskOther[],
}));

vi.mock("~/lib/agentdState", async () => {
  const { Atom } = await import("effect/reactivity");
  const allowed = Atom.make(true);
  return {
    agentdEnvironment: { startTask: { permissionAtom: () => allowed } },
    useAgentdStatus: () => ({ data: { defaultWorker: "opencode" } }),
    useAgentdCloudSetup: (cwd: string | null) => ({ data: cwd ? state.cloud : null, error: null }),
    useAgentdTaskOthers: () => ({ data: state.others, isPending: false, isSuccess: true }),
  };
});
vi.mock("~/state/entities", () => ({
  useQuietThreadShell: () => thread,
  useProject: () => ({ workspaceRoot: "/repo" }),
  useThreadProjection: () => null,
}));
vi.mock("~/state/threads", () => ({ threadEnvironment: { startTurn: {} } }));
vi.mock("~/state/vcs", () => ({
  vcsEnvironment: { refreshLocalStatusForPicker: state.refresh, status: () => null },
}));
vi.mock("~/state/query", () => ({
  useEnvironmentQuery: () => ({ data: { isRepo: true, refName: state.branch }, error: null }),
}));
vi.mock("~/state/use-atom-command", () => ({
  useAtomCommand: (command: unknown) => (command === state.refresh ? state.refresh : state.start),
}));

const thread = makeThreadFixture({ worktreePath: "/repo/worktrees/export" });
const threadRef = scopeThreadRef(thread.environmentId, thread.id);
const parentRef = scopeThreadRef(thread.environmentId, ThreadId.make("parent-thread"));

function setup(branch: string) {
  state.branch = branch;
  state.cloud = null;
  state.others = [];
  state.start.mockReset();
  state.refresh
    .mockReset()
    .mockResolvedValue(AsyncResult.success({ isRepo: true, refName: branch }));
  useRightPanelStore.setState({ byThreadKey: {} });
  openStartTaskDialog(threadRef);
}

function renderDialog() {
  return render(
    <AppAtomRegistryProvider>
      <ToastProvider>
        <StartTaskDialogHost />
      </ToastProvider>
    </AppAtomRegistryProvider>,
  );
}

async function fillTask() {
  await userEvent.fill(page.getByLabelText("Goal"), "Fix export");
  await userEvent.fill(page.getByLabelText("Check command"), "pnpm test");
  await userEvent.fill(page.getByLabelText("Budget"), "30m,$2");
}

it("shows what is missing, displays a refusal in full, and opens the tasks pane on success", async () => {
  setup("feature/export");
  state.others = [{ person: "Bob", work: "acme/app#42", activity: null, paths: ["src/export.ts"] }];
  const refusal = "Task refused: worker is not connected.\n  Run setup and try again.";
  state.start
    .mockResolvedValueOnce(
      AsyncResult.failure(
        Cause.fail(new AgentdCommandError({ message: refusal, notSetUp: false })),
      ),
    )
    .mockResolvedValueOnce(
      AsyncResult.success({
        id: "hof-123abc",
        started: true,
        note: null,
      } satisfies AgentdStartTaskResult),
    );
  await using _screen = await renderDialog();
  using _host = { [Symbol.dispose]: hostRightPanel(threadRef, parentRef) };
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect.element(start).toBeDisabled();
  await expect
    .element(page.getByRole("checkbox", { name: "Run in the cloud" }))
    .not.toBeInTheDocument();
  await expect.element(page.getByText("Enter a goal.")).toBeVisible();
  await expect.element(page.getByText("Enter a check command.")).toBeVisible();
  await expect.element(page.getByText("Enter a budget.")).toBeVisible();
  await expect
    .element(page.getByRole("combobox", { name: "Worker" }))
    .toHaveTextContent("opencode");
  await expect
    .element(page.getByLabelText("Working directory"))
    .toHaveValue("/repo/worktrees/export");

  await fillTask();
  const notice = page.getByRole("status").filter({ hasText: "Others are working here" });
  await expect.element(notice.getByText("Bob: acme/app#42")).toBeVisible();
  await expect.element(notice.getByText("src/export.ts")).toBeVisible();
  await start.click();
  await expect.element(page.getByRole("alert")).toBeVisible();
  expect(page.getByRole("alert").element().textContent).toBe(refusal);
  expect(state.start).toHaveBeenCalledTimes(1);
  expect(selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, parentRef)).toBeNull();

  await start.click();
  await expect.element(page.getByText("Started task hof-123abc.")).toBeVisible();
  await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  expect(selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, parentRef)).toBe(
    "background-tasks",
  );
  expect(state.start).toHaveBeenLastCalledWith({
    environmentId: thread.environmentId,
    input: {
      cwd: "/repo/worktrees/export",
      goal: "Fix export",
      accept: [],
      check: "pnpm test",
      worker: "opencode",
      budget: "30m,$2",
      issue: null,
    },
  });
});

it("starts a cloud task with a dollar cap and a provider key path, without the local branch gate", async () => {
  setup("main");
  state.cloud = {
    supported: true,
    project: "fork-owner/export",
    balanceUsd: 20,
    balanceText: null,
    defaultBudget: null,
    problem: null,
  };
  state.start.mockResolvedValue(
    AsyncResult.success({ id: "hof-123abc", started: true, note: null }),
  );
  await using _screen = await renderDialog();
  const option = page.getByRole("checkbox", { name: "Run in the cloud" });
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect.element(option).not.toBeChecked();
  await option.click();
  await userEvent.fill(page.getByLabelText("Goal"), "Fix export");
  await expect.element(page.getByText("Available LibraOS credit: $20.00")).toBeVisible();
  await expect
    .element(page.getByText("Worker time and inference are both billed to LibraOS credits."))
    .toBeVisible();
  await expect.element(start).toBeDisabled();
  await userEvent.fill(page.getByLabelText("Dollar cap (USD)"), "2.50");
  await expect.element(start).toBeEnabled();

  await page.getByRole("combobox", { name: "Model access" }).click();
  await page.getByRole("option", { name: "Your API key" }).click();
  const keyPath = page.getByLabelText("Anthropic key file path");
  await userEvent.fill(keyPath, "sk-example-not-a-path");
  await expect.element(start).toBeDisabled();
  await userEvent.fill(keyPath, "/private/key file");
  await expect.element(page.getByText(/Your provider bills inference separately/)).toBeVisible();
  await start.click();
  await expect.element(page.getByText("Started task hof-123abc.")).toBeVisible();
  expect(state.refresh).not.toHaveBeenCalled();
  expect(state.start).toHaveBeenCalledExactlyOnceWith({
    environmentId: thread.environmentId,
    input: {
      cwd: "/repo/worktrees/export",
      goal: "Fix export",
      accept: [],
      check: null,
      cloud: { budget: "$2.50", modelAccess: "byok", anthropicKeyFile: "/private/key file" },
    },
  });
});

it("turns off cloud start if the checkout’s origin is not a GitHub repository", async () => {
  setup("feature/export");
  state.cloud = {
    supported: true,
    project: null,
    balanceUsd: null,
    balanceText: null,
    defaultBudget: null,
    problem: null,
  };
  await using _screen = await renderDialog();
  await expect.element(page.getByRole("checkbox", { name: "Run in the cloud" })).toBeDisabled();
  await expect
    .element(page.getByText("Cloud Workers require a GitHub repository as the checkout’s origin."))
    .toBeVisible();
});

it("does not contact the worker bridge when the branch changes to main before Start", async () => {
  setup("feature/export");
  state.refresh.mockResolvedValue(AsyncResult.success({ isRepo: true, refName: "main" }));
  await using _screen = await renderDialog();
  await fillTask();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("The working directory is on main. Switch to a different branch first.");
  expect(state.start).not.toHaveBeenCalled();
});
