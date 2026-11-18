import {
  AgentdCloudBudget,
  AgentdCloudKeyFile,
  AgentdCommandError,
  type AgentdCloudSetup,
  type AgentdCloudSetupInput,
  type AgentdCloudTaskInput,
  type AgentdError,
  type AgentdStartTaskResult,
} from "@t3tools/contracts";
import { parseGitRemoteRepository } from "@t3tools/shared/git";
import * as Cache from "effect/Cache";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import type { ProcessRunner } from "../processRunner.ts";
import { agentdArgs } from "./agentdCommands.ts";

const isCloudTask = Schema.is(AgentdCloudBudget);
const isKeyFile = Schema.is(AgentdCloudKeyFile);
const balanceJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));
const balanceDetails = Schema.decodeUnknownOption(
  Schema.Struct({
    available_usd: Schema.optionalKey(Schema.Unknown),
    balance_usd: Schema.optionalKey(Schema.Unknown),
    default_budget: Schema.optionalKey(Schema.Unknown),
  }),
);
const offerReceipt = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      handoff: Schema.String,
      cloud: Schema.optionalKey(
        Schema.Struct({
          state: Schema.String,
          error: Schema.optionalKey(Schema.String),
        }),
      ),
    }),
  ),
);

const emptySetup = {
  project: null,
  balanceUsd: null,
  balanceText: null,
  defaultBudget: null,
  problem: null,
};
const originError = "Cloud Workers require a GitHub repository as the checkout’s origin.";

function cloudProblem(message: string): NonNullable<AgentdCloudSetup["problem"]> {
  if (
    /\[cloud\]|cloud(?:[._ -])key(?:[._ -]file)?|cloud_not_configured|agentd access revoked/i.test(
      message,
    )
  )
    return "setup";
  if (/insufficient[ _]credit/i.test(message)) return "credit";
  if (
    /github[ _-]app.*(?:not installed|installation|not configured)|repo(?:sitory)?[ _]not[ _]allowed/i.test(
      message,
    )
  )
    return "repository";
  return "balance";
}

function commandError(message: string, notSetUp = false) {
  return new AgentdCommandError({ message, notSetUp });
}

function offerError(message: string, notSetUp = false): AgentdCommandError {
  const problem = notSetUp ? "setup" : cloudProblem(message);
  switch (problem) {
    case "setup":
      return commandError(
        "Cloud Workers aren’t set up. Check the cloud configuration and account key file.",
        true,
      );
    case "credit":
      return commandError("There is not enough LibraOS credit for this dollar cap.");
    case "repository":
      return commandError(
        "The repository owner must install the Cloud Workers GitHub App on this repository.",
      );
    default:
      return commandError(
        /byok|(?:openai|anthropic)[._ -]key/i.test(message)
          ? "AgentD couldn’t use the provider key files. Check their paths, contents and permissions."
          : "AgentD couldn’t submit this task to Cloud Workers.",
      );
  }
}

export function cloudJobNote(message: string | null | undefined): string | null {
  if (!message || cloudProblem(message) === "balance") return null;
  return offerError(message).message;
}

function readBalance(stdout: string) {
  const parsed = balanceJson(stdout);
  if (parsed._tag === "None") return { ...emptySetup, balanceText: stdout.trim() || null };
  const details = balanceDetails(parsed.value);
  const amount =
    details._tag === "Some" ? (details.value.available_usd ?? details.value.balance_usd) : null;
  const usd =
    typeof amount === "string" && /^-?\d+(?:\.\d+)?$/.test(amount) ? Number(amount) : amount;
  const balanceUsd = typeof usd === "number" && Number.isFinite(usd) ? usd : null;
  return {
    ...emptySetup,
    balanceUsd,
    defaultBudget:
      details._tag === "Some" && isCloudTask(details.value.default_budget)
        ? details.value.default_budget
        : null,
  };
}

export const makeAgentdCloud = Effect.fn("AgentdCloud.make")(function* (deps: {
  readonly binary: Effect.Effect<string, AgentdError>;
  readonly run: (
    argv: ReadonlyArray<string>,
    options?: { readonly command?: string; readonly jsonOnFailure?: boolean },
  ) => Effect.Effect<string, AgentdError>;
  readonly runProcess: ProcessRunner["Service"]["run"];
  readonly isAbsolute: (path: string) => boolean;
  readonly args: (
    build: () => ReadonlyArray<string>,
  ) => Effect.Effect<ReadonlyArray<string>, AgentdError>;
}) {
  const { binary, run, runProcess, isAbsolute, args } = deps;
  const capabilities = yield* Cache.makeWith(
    ([command]: readonly [string, string]) =>
      run(agentdArgs.cloudHelp(), { command, jsonOnFailure: true }).pipe(
        Effect.map((help) => /(?:^|[\s[|])--cloud(?=[\s\]|=,]|$)/u.test(help)),
      ),
    { capacity: 16, timeToLive: (exit) => (Exit.isSuccess(exit) ? "Infinity" : 0) },
  );
  const cloudBinary = Effect.gen(function* () {
    const command = yield* binary;
    const version = yield* run(agentdArgs.version(), { command });
    const supported = yield* Cache.get(capabilities, [command, version.trim()]);
    return supported ? command : null;
  });

  const originProject = Effect.fn("AgentdCloud.originProject")(function* (cwd: string) {
    if (!isAbsolute(cwd) || cwd.includes("\0")) return null;
    const result = yield* runProcess({
      command: "git",
      args: ["remote", "get-url", "--", "origin"],
      cwd,
      timeout: "5 seconds",
      maxOutputBytes: 4096,
    }).pipe(Effect.option);
    if (result._tag === "None" || result.value.code !== 0) return null;
    const url = result.value.stdout.trim();
    const remote = parseGitRemoteRepository(url);
    return remote &&
      (remote.host.toLowerCase() === "github.com" ||
        /^ssh:\/\/git@ssh\.github\.com:443\//i.test(url)) &&
      /^[a-z0-9][a-z0-9-]*\/[\w.-]+$/i.test(remote.path)
      ? remote.path
      : null;
  });

  const cloudSetup = Effect.fn("AgentdCloud.setup")(function* ({
    cwd,
    includeBalance,
  }: AgentdCloudSetupInput) {
    const command = yield* cloudBinary;
    if (command === null) return { ...emptySetup, supported: false };
    const project = yield* originProject(cwd);
    if (project === null || !includeBalance) return { ...emptySetup, project, supported: true };
    return yield* run(agentdArgs.cloudBalance(), { command }).pipe(
      Effect.map((stdout): AgentdCloudSetup => ({
        ...readBalance(stdout),
        project,
        supported: true,
      })),
      Effect.catchTags({
        AgentdCommandError: (error) =>
          Effect.succeed({
            ...emptySetup,
            project,
            supported: true,
            problem: error.notSetUp ? ("setup" as const) : cloudProblem(error.message),
          }),
      }),
    );
  });

  const startCloudTask = Effect.fn("AgentdCloud.startTask")(function* (
    input: AgentdCloudTaskInput,
  ) {
    if (!isCloudTask(input.cloud.budget))
      return yield* commandError("Enter a positive dollar cap for this cloud task.");
    if (input.cloud.modelAccess === "byok") {
      const files = [input.cloud.anthropicKeyFile, input.cloud.openaiKeyFile].filter(
        (file) => file !== undefined,
      );
      if (files.length === 0 || !files.every((file) => isKeyFile(file) && isAbsolute(file))) {
        return yield* commandError(
          "Enter at least one absolute provider key-file path on the selected machine.",
        );
      }
    }
    const command = yield* cloudBinary;
    if (command === null)
      return yield* commandError("This version of AgentD does not support Cloud Workers.");
    const project = yield* originProject(input.cwd);
    if (project === null) return yield* commandError(originError);
    const argv = yield* args(() => agentdArgs.cloudOffer(input, project));
    const session = yield* args(() => agentdArgs.cloudSession(input.cwd));
    yield* run(session, { command }).pipe(
      Effect.catchTags({
        AgentdCommandError: (error) =>
          Effect.fail(
            error.notSetUp
              ? offerError(error.message, true)
              : commandError("AgentD couldn’t prepare a session for the cloud task."),
          ),
      }),
    );
    const stdout = yield* run(argv, { command }).pipe(
      Effect.catchTags({
        AgentdCommandError: (error) => Effect.fail(offerError(error.message, error.notSetUp)),
      }),
    );
    const receipt = offerReceipt(stdout);
    if (receipt._tag === "None")
      return yield* commandError(
        "AgentD did not return a cloud task receipt. Check Background tasks before trying again.",
      );
    const { handoff: id, cloud } = receipt.value;
    const note = cloud?.error
      ? offerError(cloud.error).message
      : cloud === undefined
        ? "AgentD did not confirm that Cloud Workers accepted the task. Check Background tasks for updates."
        : null;
    return { id, started: note === null, note } satisfies AgentdStartTaskResult;
  });

  return { cloudSetup, startCloudTask };
});
