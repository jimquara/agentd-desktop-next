import type { AgentdTaskOthersInput, EnvironmentId } from "@t3tools/contracts";
import { T, useGT } from "gt-react";

import { useAgentdTaskOthers } from "~/lib/agentdState";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function StartTaskOthers({
  environmentId,
  input,
}: {
  readonly environmentId: EnvironmentId;
  readonly input: AgentdTaskOthersInput | null;
}) {
  const gt = useGT();
  const { data, isPending, isSuccess } = useAgentdTaskOthers(input, environmentId);
  if (!isSuccess || isPending || !data?.length) return null;

  return (
    <div className="mx-6 mb-3 min-h-0 shrink-0">
      <Alert variant="warning" role="status">
        <AlertTitle>
          <T>Others are working here</T>
        </AlertTitle>
        <AlertDescription>
          <ul className="max-h-24 space-y-1 overflow-y-auto wrap-anywhere">
            {data.map(({ person, work, activity, paths }) => {
              const name = person ?? gt("Another team member");
              return (
                <li key={JSON.stringify([person, work, work === null ? activity : null])}>
                  <strong>{work === null ? name : gt("{name}: {work}", { name, work })}</strong>
                  {activity !== null && <div>{activity}</div>}
                  {paths.map((path) => (
                    <code key={path} className="block">
                      {path}
                    </code>
                  ))}
                </li>
              );
            })}
          </ul>
          <p>
            <T>You can still start this task.</T>
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
