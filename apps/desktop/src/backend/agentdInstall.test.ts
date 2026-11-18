import { describe, expect, it } from "@effect/vitest";

import { decideAgentdInstall, withWindowsPathEntry } from "./agentdInstall.ts";

describe("decideAgentdInstall", () => {
  it.each([
    [
      { existing: false, sameBytes: false, installedVersion: null, bundledVersion: null },
      "installed",
    ],
    [
      { existing: true, sameBytes: true, installedVersion: null, bundledVersion: null },
      "unchanged",
    ],
    [
      { existing: true, sameBytes: false, installedVersion: "v0.1.9", bundledVersion: "v0.1.11" },
      "replaced",
    ],
    [
      { existing: true, sameBytes: false, installedVersion: "v0.2.0", bundledVersion: "v0.1.11" },
      "kept-newer",
    ],
    [
      {
        existing: true,
        sameBytes: false,
        installedVersion: "v0.1.11",
        bundledVersion: "v0.1.11-rc.1",
      },
      "kept-newer",
    ],
    [
      { existing: true, sameBytes: false, installedVersion: null, bundledVersion: "v0.1.11" },
      "kept-unknown",
    ],
  ] as const)("%o is %s", (input, action) => {
    expect(decideAgentdInstall(input)).toBe(action);
  });
});

describe("withWindowsPathEntry", () => {
  const dir = "C:\\Users\\les\\AppData\\Local\\Programs\\agentd";
  it("appends the folder once, keeping every other entry as written", () => {
    expect(withWindowsPathEntry("%USERPROFILE%\\bin;;C:\\tools", dir)).toBe(
      `%USERPROFILE%\\bin;;C:\\tools;${dir}`,
    );
    expect(withWindowsPathEntry("", dir)).toBe(dir);
    expect(withWindowsPathEntry("C:\\tools;", dir)).toBe(`C:\\tools;${dir}`);
    expect(withWindowsPathEntry(`C:\\tools;${dir.toUpperCase()}\\`, dir)).toBeNull();
  });
});
