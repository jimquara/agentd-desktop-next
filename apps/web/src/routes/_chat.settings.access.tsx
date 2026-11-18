import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConnectionsSettings } from "../components/settings/ConnectionsSettings";
import { productProfile } from "../productProfile";

function SettingsAccessRoute() {
  return <ConnectionsSettings view="access" />;
}

export const Route = createFileRoute("/_chat/settings/access")({
  beforeLoad: () => {
    if (!productProfile.sharingAndAccess) throw redirect({ to: "/", replace: true });
  },
  component: SettingsAccessRoute,
});
