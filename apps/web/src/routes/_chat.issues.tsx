import { createFileRoute, redirect } from "@tanstack/react-router";

import { IssuesPage } from "../components/issue/IssuesPage";
import { issuesSearchFromUrl } from "../components/issue/issuesSearch.logic";
import { productProfile } from "../productProfile";

export const Route = createFileRoute("/_chat/issues")({
  beforeLoad: () => {
    if (!productProfile.issues) throw redirect({ to: "/", replace: true });
  },
  validateSearch: issuesSearchFromUrl,
  component: IssuesPage,
});
