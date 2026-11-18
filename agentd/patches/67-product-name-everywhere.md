# 67: The product name everywhere a person reads it

#24 renamed the product in the app's sentences. This does the same for what the server and its command line
say: every `T3 Code` in a string under `apps/server/src` that a person or an agent's user reads became
`AgentD Desktop`, and command examples (`t3 up`, `t3 serve`, `t3 connect`, ...) became `agentd-desktop up` and so on,
there and in `apps/desktop/src`, `apps/web/src` and `packages/client-runtime`. The CLI's root command is now
`agentd-desktop`, so `agentd-desktop --help` and every subcommand's usage line say it. Server text also lost the
bare "T3 server", "T3 home", "T3 thread" and "T3's browser" (now "AgentD Desktop server", "AgentD Desktop home",
"AgentD Desktop thread", "AgentD Desktop's browser"). Done with a scripted pass that skipped comment lines,
then hand edits. Sentences changed inside `msg()`/`gt()` get new catalog keys; the catalogs are regenerated in the
last task, as the task rules say.

## Kept on purpose

`git grep -n 'T3 Code' -- apps/server/src apps/desktop/src apps/web/src packages` still finds:

- Comments (the task leaves them alone), and tests, test fixtures (`testkit/fixtures/*.ndjson`,
  `OpenCode2TextGeneration.fixture.ts`) whose data only looks like the name.
- `apps/server/src/provider/CodexProvider.ts` `CODEX_CLIENT_NAME = "T3 Code"`: Codex sends it to OpenAI as the
  `originator` of every request (`CODEX_INTERNAL_ORIGINATOR_OVERRIDE`). OpenAI may treat known originators
  differently; changing it needs a check against a real ChatGPT account, not a rename.
- `apps/server/src/provider/CodexChatGptAuth.ts` `agent_name_hint: "T3 Code"`: part of OpenAI's dynamic agent
  client registration, same reason.
- `apps/server/src/triage/triagePrompt.ts` `TRIAGE_PLAYBOOK`: must stay byte-identical to
  `.github/triage/PLAYBOOK.md` (upstream's triage playbook, which files issues in its repository).
- `apps/desktop/src/app/DesktopUserData.ts`, `DesktopLegacyLocalStorage.ts`: earlier installs' folder names, #66's files.
- `packages/source-control-github/src/shared/definition.ts` (`T3 Code for GitHub`, upstream's GitHub app) and
  `packages/provider-acp-registry/src/server/adapter.ts` (a comment): as in patch 24.

## Not changed here

- `t3@<version>` and `npx t3 ...` (the npm package upstream publishes, e.g. the in-app triage command), the
  launcher file names `t3`/`t3.cmd` and "Another t3 is already at": packaging and the installed command, #66's.
- `T3 Connect` and `T3 account` (upstream's hosted service, hidden by the product profile), `T3CODE_*` names,
  `t3code.service`, settings search keywords.
- Model-facing MCP tool descriptions changed with the name; the evals in `evals/` were not run (they call real models).

## Windows

Only text changed, plus the name `resolveCommandPath` looks up on PATH, which already resolves `.cmd`/`.exe`.
Not run on Windows.

## Files

- `apps/desktop/src/backend/DesktopHomeOwner.ts`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/desktop/src/wsl/DesktopWslBackend.ts`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/server/src/auth/McpOAuth.ts`: `resource_name` on the MCP sign-in page is AgentD Desktop.
- `apps/server/src/background/KeepAwake.ts`: `systemd-inhibit --who=` shows AgentD Desktop to the OS.
- `apps/server/src/binCli.ts`: the root command is `agentd-desktop`, so `--help` usage lines and `help` say it; description names AgentD Desktop.
- `apps/server/src/cli/acpMcpBridge.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/app.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/automaticPort.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/browser.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/config.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/connect.ts`: messages; credential label `agentd-desktop connect cli`.
- `apps/server/src/cli/doctor.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/environment.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/install.ts`: `install` help says "a command on your PATH" instead of naming `t3` (the file it writes is #66's).
- `apps/server/src/cli/invocation.ts`: generated command hints say `agentd-desktop X`, and the on-PATH check looks for `agentd-desktop` (one constant). Touches the installed-command area of #66: only the name looked up, no file names.
- `apps/server/src/cli/managedChatGptToken.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/pair.ts`: messages; default credential label `agentd-desktop pair` (shown under Authorized clients).
- `apps/server/src/cli/policy.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/project.ts`: credential label `agentd-desktop project cli` (shown under Authorized clients).
- `apps/server/src/cli/server.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/service.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/theme.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/thread.ts`: messages; credential label `agentd-desktop thread cli`.
- `apps/server/src/cli/triage.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/uninstall.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/updateProgress.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/update.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cli/up.ts`: CLI help, messages and errors name AgentD Desktop and `agentd-desktop`.
- `apps/server/src/cloud/bootService.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/cloud/cliAuthHtml.ts`: product name per channel on the CLI sign-in page.
- `apps/server/src/cloud/CliTokenManager.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/cloud/CloudLink.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/cloud/ConnectReachability.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/cloud/RelayClientLedger.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/cloud/relayResponse.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/cloud/selfUpdate.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/cloud/servicePreflight.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/desktopUpdate/DesktopAppUpdate.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/device/AgentDeviceShim.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/device/DeviceToolchain.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/device/EasDeviceHost.ts`: name given to leased devices.
- `apps/server/src/device/SshDeviceHost.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/diagnostics/ProcessDiagnostics.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/mcp/AcpMcpStdioBridge.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/mcp/McpHttpServer.ts`: MCP server name and credential error.
- `apps/server/src/mcp/McpInvocationContext.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/OrchestratorMcpService.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/threadAccess.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/ThreadMetadataMcpService.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/toolkits/device/handlers.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/toolkits/issues/tools.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/toolkits/orchestrator/tools.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/toolkits/pullRequests/tools.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/toolkits/theme/tools.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/toolkits/toolSearch/tools.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/mcp/WorktreeMcpService.ts`: MCP tool text and errors an agent shows the user name AgentD Desktop.
- `apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/Adapters/CodexAdapterV2.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/ContextHandoffService.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/Orchestrator.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/ProviderTurnStartService.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/PullRequestWatchReactor.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/pullRequestWatch.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/RestartBackgroundNote.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/RestartContinuation.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/orchestration-v2/UserFacingErrors.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/peer/PeerLinks.testkit.ts`: test kit finds peer sessions by the new label prefix.
- `apps/server/src/peer/PeerLinks.ts`: messages; a peer link's client label is `AgentD Desktop · <name>` (shown under Authorized clients).
- `apps/server/src/persistence/DatabaseMaintenance.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/persistence/DatabaseStorage.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/persistence/Sqlite.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/policy/policyTemplates.ts`: policy help text and ADMX/mobileconfig display names; ADMX ids (`T3Code`) kept.
- `apps/server/src/preview/PreviewBrowserHost.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/preview/PreviewBrowser.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/preview/ServerBrowserPage.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/preview/ServerBrowser.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/project/ManagedProjectFolders.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/acp/AntigravityAcpSupport.ts`: ACP clientInfo title (name `t3-code` kept: an id).
- `apps/server/src/provider/AcpRegistrySessions.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/AntigravityInstallation.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/AntigravityProvider.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/ClaudeProvider.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/CodexAuthCallbackPage.ts`: page title and text of the Codex sign-in callback page.
- `apps/server/src/provider/CodexInstallation.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/CodexProvider.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/ProviderAuthService.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/providerCompatibility.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/providerInstallation.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/provider/providerMaintenanceRunner.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/serverOwnership.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/serverRuntimeStartup.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/serviceLauncher.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/startupAccess.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/textGeneration/textGeneratorDrivers.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/server/src/triage/triagePrompt.ts`: the triage session context names AgentD Desktop and `agentd-desktop triage`; the playbook is kept (see below).
- `apps/server/src/vcs/GitVcsDriver.ts`: author/committer name of checkpoint commits is AgentD Desktop (email unchanged, see patch 24).
- `apps/server/src/ws.ts`: user-visible messages and errors name AgentD Desktop.
- `apps/web/src/components/cloud/ConnectCliAuthSurface.tsx`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/web/src/components/HostedEmptyState.tsx`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/web/src/components/mcp/UseInAnotherAppDialog.tsx`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/web/src/components/settings/LinkedEnvironmentsSettings.tsx`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/web/src/components/settings/SavedEnvironmentRows.tsx`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/web/src/components/sidebar/updateEverything.logic.ts`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `apps/web/src/lib/bootError.ts`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
- `packages/client-runtime/src/connection/diagnosis.ts`: commands shown to the user read `agentd-desktop …` instead of `t3 …`.
