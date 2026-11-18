import { afterEach, expect, it, vi } from "vite-plus/test";

import { createMemoryStorage } from "./lib/storage";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

it("restores the mode after reload without sharing it across environments", async () => {
  vi.stubGlobal("window", { localStorage: createMemoryStorage() });
  const initial = await import("./chatCodeModeStore");
  initial.setChatCodeMode("local:thread-1", "code");

  vi.resetModules();
  const reloaded = await import("./chatCodeModeStore");
  expect(reloaded.revealCodeMode("local:thread-1")).toBe(false);
  expect(reloaded.revealCodeMode("remote:thread-1")).toBe(true);
  reloaded.setChatCodeMode("local:thread-1", "chat");

  vi.resetModules();
  const reloadedAgain = await import("./chatCodeModeStore");
  expect(reloadedAgain.revealCodeMode("local:thread-1")).toBe(true);
  expect(reloadedAgain.revealCodeMode("remote:thread-1")).toBe(false);
});
