import { T } from "gt-react";
import { cn } from "~/lib/utils";

import { CommandBlock } from "./CommandBlock";

/** Setup steps for another computer. This build publishes no install script, so only `command` is shown. */
export function InstallT3Commands({
  command,
  className,
}: {
  readonly command: string;
  readonly className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">
        <T>
          This build has no install script yet. With <code className="font-mono">t3</code> installed
          on that computer, run:
        </T>
      </p>
      <CommandBlock command={command} />
    </div>
  );
}
