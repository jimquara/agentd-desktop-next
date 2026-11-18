import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../ui/collapsible";

export function BackgroundTaskCard(props: {
  readonly title: string;
  readonly summary: ReactNode;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <li className="min-w-0 rounded-lg border border-border/60 bg-muted/30">
      <Collapsible>
        <div className="flex items-start gap-1">
          <CollapsibleTrigger className="group flex min-w-0 flex-1 items-start gap-2 rounded-lg p-2.5 text-left hover:bg-muted/65 focus-visible:outline-2 focus-visible:outline-ring">
            <ChevronRightIcon
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-data-panel-open:rotate-90"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{props.title}</span>
              <span className="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                {props.summary}
              </span>
            </span>
          </CollapsibleTrigger>
          {props.action ? <div className="mt-1.5 mr-1.5 shrink-0">{props.action}</div> : null}
        </div>
        <CollapsiblePanel animate={false}>
          <div className="space-y-2 border-t border-border/60 p-2.5 text-xs">
            <p className="wrap-anywhere whitespace-pre-wrap select-text">{props.title}</p>
            {props.children}
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </li>
  );
}
