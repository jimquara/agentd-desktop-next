import { createFileRoute, redirect } from "@tanstack/react-router";
import { validateScheduledTasksSearch } from "../components/settings/scheduledTasksSettings.logic";

import { ScheduledTasksSettings } from "../components/settings/ScheduledTasksSettings";
import { productProfile } from "../productProfile";

function SettingsScheduledTasksRoute() {
  const target = Route.useSearch();
  return <ScheduledTasksSettings {...target} />;
}

export const Route = createFileRoute("/_chat/settings/scheduled-tasks")({
  beforeLoad: () => {
    if (!productProfile.scheduledTasks) throw redirect({ to: "/", replace: true });
  },
  validateSearch: validateScheduledTasksSearch,
  component: SettingsScheduledTasksRoute,
});
