import { expect, it } from "vite-plus/test";

import { sidebarTabForProject } from "./sidebarTabStore";

it("puts scratch projects under Chat and everything else, unknown included, under Code", () => {
  expect(sidebarTabForProject({ workspaceRoot: "/s", isScratch: true }, null)).toBe("chat");
  expect(sidebarTabForProject({ workspaceRoot: "/home/a/scratch" }, "/home/a/scratch")).toBe(
    "chat",
  );
  expect(sidebarTabForProject({ workspaceRoot: "/projects/x" }, "/home/a/scratch")).toBe("code");
  expect(sidebarTabForProject(null, "/home/a/scratch")).toBe("code");
});
