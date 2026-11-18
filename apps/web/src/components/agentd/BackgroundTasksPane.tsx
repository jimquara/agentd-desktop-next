import type { ScopedThreadRef } from "@t3tools/contracts";
import { T } from "gt-react";

import { Empty, EmptyHeader, EmptyTitle } from "../ui/empty";

export function BackgroundTasksPane(_props: { readonly threadRef: ScopedThreadRef }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          <T>No background tasks</T>
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
