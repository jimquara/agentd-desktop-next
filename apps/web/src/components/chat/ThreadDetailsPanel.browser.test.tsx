import {
  CheckpointRef,
  EnvironmentId,
  ProjectId,
  RunId,
  ThreadId,
  type ScopedThreadRef,
  type ThreadPullRequestLink,
} from "@t3tools/contracts";
import type { ThreadCheckpointSummary } from "@t3tools/client-runtime/state/thread-checkpoints";
import {
  deriveLatestContextWindowSnapshot,
  type ContextWindowSnapshot,
} from "@t3tools/client-runtime/state/context-window";
import { AsyncResult, Atom } from "effect/reactivity";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

const SCRATCH_ROOT = "/home/user/.t3/scratch";

const state = vi.hoisted(() => ({
  workspaceRoot: "",
  folder: "",
  pullRequests: [] as unknown[],
  configLoaded: true,
  checkpoints: [] as readonly ThreadCheckpointSummary[],
}));

vi.mock(import("~/state/entities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useProject: ((ref: unknown) =>
    ref === null
      ? null
      : {
          id: "project",
          environmentId: "environment",
          title: state.workspaceRoot === SCRATCH_ROOT ? "No project" : "plain",
          workspaceRoot: state.workspaceRoot,
          scripts: [],
        }) as never,
  useProjects: (() => []) as never,
  useThreadCheckpointSummaries: () => state.checkpoints,
  useQuietThreadShell: ((ref: unknown) =>
    ref === null
      ? null
      : {
          id: "thread",
          environmentId: "environment",
          projectId: "project",
          worktreePath: state.folder,
          branch: null,
          pullRequests: state.pullRequests,
        }) as never,
  useServerConfigs: (() =>
    new Map(
      state.configLoaded
        ? [
            [
              EnvironmentId.make("environment"),
              {
                scratchWorkspaceRoot: SCRATCH_ROOT,
                environment: { capabilities: { pullRequests: true } },
              },
            ],
          ]
        : [],
    )) as never,
}));
// Neither folder is a repository, which is what the server reports for both.
vi.mock(import("~/state/vcs"), async (importOriginal) => {
  const actual = await importOriginal();
  const notARepo = Atom.make(
    AsyncResult.success({
      isRepo: false,
      hasPrimaryRemote: false,
      isDefaultRef: false,
      refName: null,
      hasWorkingTreeChanges: false,
      workingTree: { files: [], insertions: 0, deletions: 0 },
      hasUpstream: false,
      aheadCount: 0,
      behindCount: 0,
      aheadOfDefaultCount: 0,
      pr: null,
    }),
  );
  return {
    ...actual,
    vcsEnvironment: { ...actual.vcsEnvironment, status: (() => notARepo) as never },
  };
});

import { render } from "../../../test/render";
import { selectThreadDiffPanelSelection, useDiffPanelStore } from "../../diffPanelStore";
import { selectActiveRightPanel, useRightPanelStore } from "../../rightPanelStore";
import { PopoverCreateHandle } from "../ui/popover";
import { ChatCanvasContext } from "./ChatCanvasContext";
import { resolveChatCanvasLayout } from "./chatCanvasLayout";
import { ThreadDetailsPanel } from "./ThreadDetailsPanel";

const threadRef: ScopedThreadRef = {
  environmentId: EnvironmentId.make("environment"),
  threadId: ThreadId.make("thread"),
};
const container = { width: 1200, height: 800 };
const placement = { x: 908, y: 0, right: 12, width: 280, height: 400 } as const;
const linkedPullRequest: ThreadPullRequestLink = {
  host: "github.com",
  repository: "pingdotgg/t3code",
  number: 27513,
  url: "https://github.com/pingdotgg/t3code/pull/27513",
  source: "manual",
  linkedAt: "2026-10-30T00:00:00.000Z",
  snapshot: null,
  stack: null,
};

function setup(input: {
  workspaceRoot: string;
  folder: string;
  pullRequests?: ThreadPullRequestLink[];
  configLoaded?: boolean;
  checkpoints?: readonly ThreadCheckpointSummary[];
  contextWindow?: ContextWindowSnapshot | null;
}) {
  state.configLoaded = input.configLoaded ?? true;
  state.workspaceRoot = input.workspaceRoot;
  state.folder = input.folder;
  state.pullRequests = input.pullRequests ?? [];
  state.checkpoints = input.checkpoints ?? [];
  useRightPanelStore.setState({ byThreadKey: {}, threadPanelVisibilityByThreadKey: {} });
  useDiffPanelStore.setState({ byThreadKey: {} });
  const anchor = document.createElement("div");
  document.body.append(anchor);
  return {
    anchor: { current: anchor },
    handle: PopoverCreateHandle(),
    contextWindow: input.contextWindow ?? null,
    [Symbol.dispose]: () => anchor.remove(),
  };
}

function Panel({ fixture }: { fixture: ReturnType<typeof setup> }) {
  const noop = () => {};
  const scriptResult = async () => ({ ok: true }) as never;
  return (
    <ChatCanvasContext
      value={{
        container,
        lane: { padding: 48, minChatWidth: 640 },
        layout: resolveChatCanvasLayout({ container, preview: null }),
        previewKey: null,
        registerTimeline: noop,
        measureDetailsCard: noop,
        detailsCardTopInset: 0,
        preferredDetailsCard: placement,
        detailsCardPlacement: placement,
      }}
    >
      <ThreadDetailsPanel
        anchor={fixture.anchor}
        handle={fixture.handle}
        environmentId={threadRef.environmentId}
        threadId={threadRef.threadId}
        projectId={ProjectId.make("project")}
        composerDraftTarget={threadRef}
        worktreePath={state.folder}
        isServerThread
        activeProjectName={state.workspaceRoot === SCRATCH_ROOT ? "No project" : "plain"}
        activeProjectScripts={undefined}
        preferredScriptId={null}
        keybindings={[]}
        availableEditors={[]}
        showOpenInPicker={false}
        openInShortcutEnabled={false}
        gitCwd={state.folder}
        workspaceMutationId={null}
        isGitRepo={false}
        envLocked
        availableEnvironments={[]}
        onEnvModeChange={noop}
        envMode="local"
        startFromOrigin={false}
        onStartFromOriginChange={noop}
        onComposerFocusRequest={noop}
        onRunProjectScript={noop}
        onAddProjectScript={scriptResult}
        onUpdateProjectScript={scriptResult}
        onDeleteProjectScript={scriptResult}
        usage={{
          providerInstanceId: null,
          providers: [],
          sources: [],
          contextWindow: fixture.contextWindow,
        }}
      />
    </ChatCanvasContext>
  );
}

it("offers no git controls in a No project thread, but shows its linked pull request", async () => {
  using fixture = setup({
    workspaceRoot: SCRATCH_ROOT,
    folder: `${SCRATCH_ROOT}/thread`,
    pullRequests: [linkedPullRequest],
  });
  await using _screen = await render(<Panel fixture={fixture} />);
  await expect.element(page.getByText("#27513")).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Initialize Git" }))
    .not.toBeInTheDocument();
});

it("shows a linked pull request in a folder that is not a git repository", async () => {
  using fixture = setup({
    workspaceRoot: "/work/plain",
    folder: "/work/plain",
    pullRequests: [linkedPullRequest],
  });
  await using _screen = await render(<Panel fixture={fixture} />);
  await expect.element(page.getByRole("heading", { name: "Environment" })).toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Context" })).toBeVisible();
  await expect.element(page.getByText("Not reported by this agent")).toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Outputs" })).toBeVisible();
  await expect.element(page.getByText("#27513")).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Initialize Git" })).toBeVisible();
});

it("offers no Initialize Git before the server config says where No project lives", async () => {
  using fixture = setup({
    workspaceRoot: SCRATCH_ROOT,
    folder: `${SCRATCH_ROOT}/thread`,
    configLoaded: false,
  });
  await using _screen = await render(<Panel fixture={fixture} />);
  await expect.element(page.getByRole("region", { name: "Environment" })).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Initialize Git" }))
    .not.toBeInTheDocument();
});

it("opens the latest diff for a repeated output and offers the rest beyond eight rows", async () => {
  const olderRunId = RunId.make("older");
  const latestRunId = RunId.make("latest");
  const file = (path: string) => ({ path, kind: "modified", additions: 2, deletions: 1 });
  const checkpoint = (runId: RunId, count: number, paths: string[]): ThreadCheckpointSummary => ({
    runId,
    checkpointTurnCount: count,
    checkpointRef: CheckpointRef.make(`refs/checkpoints/${runId}`),
    status: "ready",
    files: paths.map(file),
    assistantMessageId: null,
    completedAt: `2026-11-0${count}T00:00:00.000Z`,
  });
  using fixture = setup({
    workspaceRoot: "/work/plain",
    folder: "/work/plain",
    contextWindow: deriveLatestContextWindowSnapshot([], {
      usedTokens: 25_000,
      maxTokens: 100_000,
      updatedAt: "2026-11-02T00:00:00.000Z",
    }),
    checkpoints: [
      checkpoint(olderRunId, 1, ["src/Older.ts", "latest.ts", "ninth.ts"]),
      checkpoint(latestRunId, 2, ["latest.ts", "a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"]),
    ],
  });
  await using _screen = await render(<Panel fixture={fixture} />);
  const context = page.getByRole("region", { name: "Context" });
  await expect.element(context.getByText("25% used")).toBeVisible();
  await expect.element(context.getByText("25k / 100k")).toBeVisible();
  const outputs = page.getByRole("region", { name: "Outputs" });
  const rows = outputs.getByRole("button", { name: /^Open diff for / });
  await expect.element(rows).toHaveLength(8);
  await expect.element(rows.first()).toHaveAccessibleName("Open diff for latest.ts");
  await expect.element(rows.last()).toHaveAccessibleName("Open diff for src/Older.ts");

  await rows.last().click();
  expect(selectActiveRightPanel(useRightPanelStore.getState().byThreadKey, threadRef)).toBe("diff");
  expect(
    selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, threadRef),
  ).toMatchObject({
    kind: "turn",
    turnId: olderRunId,
    filePath: "src/Older.ts",
  });

  await rows.first().click();
  expect(
    selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, threadRef),
  ).toMatchObject({
    kind: "turn",
    turnId: latestRunId,
    filePath: "latest.ts",
  });

  await outputs.getByRole("button", { name: "Show all" }).click();
  expect(
    selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, threadRef),
  ).toMatchObject({
    kind: "turn",
    turnId: latestRunId,
    filePath: null,
  });
});
