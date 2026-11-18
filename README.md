# AgentD Desktop

A desktop, web and phone app for the coding agents that [agentd](https://github.com/libraos/agentd-core) runs and coordinates. agentd is the authority: the app shows its tasks, approvals and workers, and keeps no copy of its own as the truth. It drives the agents already installed and signed in on your machine, such as Claude Code, Codex and opencode. It has no model access of its own and prefers no agent.

## Built on T3 Code

AgentD Desktop is a fork of [T3 Code](https://github.com/pingdotgg/t3code) by T3 Tools Inc., used under the [MIT licence](./LICENSE). `LICENSE` keeps upstream's text and copyright line unchanged. We keep merging upstream; [agentd/UPSTREAM.md](./agentd/UPSTREAM.md) explains how, and `agentd/patches/` lists every change we make to upstream files.

## Run it

Install [Vite+](https://viteplus.dev/guide/), which provides the `vp` command and the pinned Node version:

```sh
curl -fsSL https://vite.plus | bash
```

Then, from the repository root:

```sh
vp i
vp run dev
```

Open the pairing URL printed by the dev runner. The [development runbook](./docs/operations/development.md) covers state directories, ports, remote access and desktop builds.

## Design

The design and the plan of work are in [libraos/agentd-core#898](https://github.com/libraos/agentd-core/issues/898). Rules for anyone changing this repository, people or agents, are in [AGENTS.md](./AGENTS.md).

## Licence

[MIT](./LICENSE). Copyright (c) 2026 T3 Tools Inc. for T3 Code.
