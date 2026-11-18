import { createFileRoute } from "@tanstack/react-router";

import { AgentdPage } from "../components/agentd/AgentdPage";

export const Route = createFileRoute("/_chat/agentd")({
  component: AgentdPage,
});
