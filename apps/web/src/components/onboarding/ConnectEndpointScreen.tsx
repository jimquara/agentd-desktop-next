import { msg, T, useGT, useMessages } from "gt-react";
import { CheckIcon, ServerIcon, Settings2Icon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { AnthropicIcon, OllamaIcon, OpenAI } from "../Icons";
import { T3Wordmark } from "../T3Wordmark";

const agents = ["Claude Code", "Codex", "opencode"] as const;
type Agent = (typeof agents)[number];

const endpoints: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly agents: readonly Agent[];
  readonly Icon: typeof T3Wordmark | typeof AnthropicIcon | typeof ServerIcon;
}> = [
  { id: "gateway", label: msg("LibraOS Gateway"), agents, Icon: T3Wordmark },
  {
    id: "anthropic",
    label: msg("Anthropic API key"),
    agents: ["Claude Code", "opencode"],
    Icon: AnthropicIcon,
  },
  { id: "openai", label: msg("OpenAI API key"), agents: ["Codex", "opencode"], Icon: OpenAI },
  { id: "bedrock", label: msg("AWS Bedrock"), agents, Icon: ServerIcon },
  { id: "ollama", label: msg("Ollama"), agents, Icon: OllamaIcon },
  { id: "custom", label: msg("Custom endpoint"), agents, Icon: Settings2Icon },
];

export function ConnectEndpointScreen({
  gatewayChosen = false,
  back,
}: {
  readonly gatewayChosen?: boolean;
  readonly back: ReactNode;
}) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const gt = useGT();
  const m = useMessages();
  const id = useId();
  const customEndpointDetail =
    agent === "Claude Code"
      ? gt("Requires Anthropic Messages or a compatible Bedrock or Vertex endpoint.")
      : agent === "Codex"
        ? gt("Requires the OpenAI Responses API.")
        : gt("Supports Chat Completions, Responses, or Messages, depending on the provider.");

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground">
        <T>Use an API key or gateway</T>
      </h1>
      {gatewayChosen && agent === null ? (
        <p className="text-center text-sm text-muted-foreground">
          <T>LibraOS Gateway selected.</T> <T>Requires a LibraOS account.</T>
        </p>
      ) : null}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          <T>Choose an agent</T>
        </legend>
        <div className="flex flex-wrap gap-2">
          {agents.map((name) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm has-checked:border-primary/60"
            >
              <input
                type="radio"
                name={id}
                value={name}
                checked={agent === name}
                onChange={() => setAgent(name)}
                className="accent-primary"
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      {agent !== null ? (
        <ul aria-label={gt("Endpoint options")} className="space-y-2">
          {endpoints.map((endpoint) => {
            if (!endpoint.agents.includes(agent)) return null;
            const isGateway = endpoint.id === "gateway";
            const selected = isGateway && gatewayChosen;
            const labelId = `${id}-${endpoint.id}`;
            const descriptionId = `${labelId}-description`;
            const detail = isGateway
              ? gt("Requires a LibraOS account.")
              : endpoint.id === "custom"
                ? customEndpointDetail
                : null;

            return (
              <li key={endpoint.id}>
                <button
                  type="button"
                  disabled
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                  aria-pressed={isGateway ? selected : undefined}
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left aria-pressed:border-primary/60"
                >
                  <endpoint.Icon className="size-5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span id={labelId} className="block text-sm font-medium text-foreground">
                      {m(endpoint.label)}
                    </span>
                    <span id={descriptionId} className="block text-xs text-muted-foreground">
                      {detail === null ? null : <span className="block">{detail}</span>}
                      <T>Not available yet</T>
                    </span>
                  </span>
                  {selected ? (
                    <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="text-center text-sm underline underline-offset-4">{back}</div>
    </div>
  );
}
