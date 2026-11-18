import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "./lib/storage";

type ChatCodeMode = "chat" | "code";

interface ChatCodeModeState {
  codeThreadKeys: Record<string, true>;
  setMode: (threadKey: string, mode: ChatCodeMode) => void;
}

const useChatCodeModeStore = create<ChatCodeModeState>()(
  persist(
    (set, get) => ({
      codeThreadKeys: {},
      setMode: (threadKey, mode) => {
        const { codeThreadKeys } = get();
        if ((codeThreadKeys[threadKey] === true) === (mode === "code")) return;
        if (mode === "code") {
          set({ codeThreadKeys: { ...codeThreadKeys, [threadKey]: true } });
        } else {
          const { [threadKey]: _removed, ...remaining } = codeThreadKeys;
          set({ codeThreadKeys: remaining });
        }
      },
    }),
    {
      name: "t3code:chat-code-mode:v1",
      storage: createJSONStorage(() =>
        resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
      ),
      partialize: (state) => ({ codeThreadKeys: state.codeThreadKeys }),
    },
  ),
);

export function useChatCodeMode(threadKey: string | null): ChatCodeMode {
  return useChatCodeModeStore((state) =>
    threadKey !== null && state.codeThreadKeys[threadKey] === true ? "code" : "chat",
  );
}

export function setChatCodeMode(threadKey: string, mode: ChatCodeMode): void {
  useChatCodeModeStore.getState().setMode(threadKey, mode);
}

export function revealCodeMode(threadKey: string): boolean {
  const { codeThreadKeys, setMode } = useChatCodeModeStore.getState();
  if (codeThreadKeys[threadKey] === true) return false;
  setMode(threadKey, "code");
  return true;
}
