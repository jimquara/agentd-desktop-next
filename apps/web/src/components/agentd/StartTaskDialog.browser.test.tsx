import "~/index.css";

import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import {
  AgentdCommandError,
  type AgentdStartTaskResult,
  type AgentdTaskOther,
  ThreadId,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/reactivity";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { setChatCodeMode, useChatCodeMode } from "~/chatCodeModeStore";
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
  others: [] as AgentdTaskOther[],
}));

vi.mock("~/lib/agentdState", async () => {
  const { Atom } = await import("effect/reactivity");
  const allowed = Atom.make(true);
  return {
    agentdEnvironment: { startTask: { permissionAtom: () => allowed } },
    useAgentdStatus: () => ({ data: { defaultWorker: "opencode" } }),
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
const parentKey = scopedThreadKey(parentRef);

function setup(branch: string) {
  state.branch = branch;
  state.others = [];
  state.start.mockReset();
  state.refresh
    .mockReset()
    .mockResolvedValue(AsyncResult.success({ isRepo: true, refName: branch }));
  useRightPanelStore.setState({ byThreadKey: {} });
  setChatCodeMode(parentKey, "chat");
  openStartTaskDialog(threadRef);
}

function ParentCodeMode() {
  return <output data-testid="parent-mode">{useChatCodeMode(parentKey)}</output>;
}

function renderDialog() {
  return render(
    <AppAtomRegistryProvider>
      <ToastProvider>
        <StartTaskDialogHost />
        <ParentCodeMode />
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
  await expect.element(page.getByTestId("parent-mode")).toHaveTextContent("code");
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
