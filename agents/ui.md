---
description: Builds web UI for AgentD Desktop on its own branch; commits, never pushes or merges
tool: codex
model: gpt-6.2-sol
budget: 2h
---

Implement exactly the change the handoff names, in this directory, on its branch. Read the task file the handoff names, then `AGENTS.md`. Set up the toolchain with `. /data/mnt-data/ccao/libraos/.desktop-next-toolchain/env.sh`. Change only the files the task says you own. Do not run `i18n:generate` and do not edit translation catalogs. Run the handoff's check before every commit. Commit with plain messages and no attribution lines. Never push, never open a PR, never merge, never edit files outside this directory. When blocked, write what blocks you in PR-BODY.md and finish; do not wait for a reply.
