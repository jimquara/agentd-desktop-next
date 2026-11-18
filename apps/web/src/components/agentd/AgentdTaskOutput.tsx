import type { AgentdHandoffId, EnvironmentId } from "@t3tools/contracts";
import { TERMINAL_PALETTES, terminalOutputSpans } from "@t3tools/shared/terminalOutput";
import { T, useGT, Var } from "gt-react";
import { useLayoutEffect, useRef } from "react";

import { useTheme } from "../../hooks/useTheme";
import { useAgentdTaskOutput } from "../../lib/agentdState";

const FOLLOW_SLACK_PX = 8;

export function AgentdTaskOutput(props: {
  readonly id: AgentdHandoffId | null;
  readonly environmentId: EnvironmentId;
}) {
  const { data, error } = useAgentdTaskOutput(props.id, props.environmentId);
  const { resolvedTheme } = useTheme();
  const gt = useGT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const text = data?.output.text ?? "";

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- follow the browser scroller unless the user has scrolled back
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (scroller && followRef.current) scroller.scrollTop = scroller.scrollHeight;
  });

  if (error) {
    return (
      <p className="text-destructive" role="alert">
        <T>
          Couldn&apos;t load output: <Var>{error}</Var>
        </T>
      </p>
    );
  }
  if (text === "") {
    return (
      <p className="text-muted-foreground">
        {props.id !== null && data === null ? <T>Loading output…</T> : <T>No output yet.</T>}
      </p>
    );
  }

  const spans = terminalOutputSpans(text, TERMINAL_PALETTES[resolvedTheme]);
  return (
    <div
      ref={scrollRef}
      role="region"
      aria-label={gt("Task output")}
      tabIndex={0}
      onScroll={({ currentTarget }) => {
        followRef.current =
          currentTarget.scrollHeight - currentTarget.scrollTop - currentTarget.clientHeight <=
          FOLLOW_SLACK_PX;
      }}
      className="max-h-80 overflow-auto overscroll-contain rounded-md bg-background/70 p-2 font-mono text-xs text-muted-foreground"
    >
      {data?.output.truncated ? (
        <p className="italic">
          <T>Earlier output not shown</T>
        </p>
      ) : null}
      <pre className="wrap-anywhere whitespace-pre-wrap select-text">
        {spans.map((span, index) =>
          span.style === null ? (
            span.text
          ) : (
            // oxlint-disable-next-line react/no-array-index-key -- terminal spans are positional
            <span key={index} style={span.style}>
              {span.text}
            </span>
          ),
        )}
      </pre>
    </div>
  );
}
