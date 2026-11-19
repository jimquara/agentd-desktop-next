import { isScratchProject } from "@t3tools/client-runtime/state/projects";
import type { ScopedThreadRef } from "@t3tools/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "./lib/storage";

export type SidebarTab = "chat" | "code";

interface SidebarTabState {
  tab: SidebarTab;
  lastThreads: Partial<Record<SidebarTab, ScopedThreadRef>>;
  /** The route whose tab was last selected; not persisted, so a reload follows the route once. */
  followedRouteKey: string | null;
}

const useSidebarTabStore = create<SidebarTabState>()(
  persist((): SidebarTabState => ({ tab: "code", lastThreads: {}, followedRouteKey: null }), {
    name: "t3code:sidebar-tab:v1",
    storage: createJSONStorage(() =>
      resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
    ),
    partialize: ({ tab, lastThreads }) => ({ tab, lastThreads }),
  }),
);

export function sidebarTabForProject(
  project: { readonly workspaceRoot: string; readonly isScratch?: true } | null | undefined,
  scratchWorkspaceRoot: string | null | undefined,
): SidebarTab {
  return project != null && isScratchProject(project, scratchWorkspaceRoot) ? "chat" : "code";
}

export function useSidebarTab(): SidebarTab {
  return useSidebarTabStore((state) => state.tab);
}

export function setSidebarTab(tab: SidebarTab): void {
  if (useSidebarTabStore.getState().tab !== tab) useSidebarTabStore.setState({ tab });
}

export function useFollowedRouteKey(): string | null {
  return useSidebarTabStore((state) => state.followedRouteKey);
}

/** Selects the open route's tab once per route, leaving later tab clicks alone. */
export function followRouteTab(routeKey: string, tab: SidebarTab): void {
  if (useSidebarTabStore.getState().followedRouteKey === routeKey) return;
  useSidebarTabStore.setState({ followedRouteKey: routeKey, tab });
}

export function rememberSidebarTabThread(tab: SidebarTab, ref: ScopedThreadRef): void {
  const { lastThreads } = useSidebarTabStore.getState();
  const current = lastThreads[tab];
  if (current?.environmentId === ref.environmentId && current.threadId === ref.threadId) return;
  useSidebarTabStore.setState({
    lastThreads: {
      ...lastThreads,
      [tab]: { environmentId: ref.environmentId, threadId: ref.threadId },
    },
  });
}

export function lastSidebarTabThread(tab: SidebarTab): ScopedThreadRef | null {
  return useSidebarTabStore.getState().lastThreads[tab] ?? null;
}
