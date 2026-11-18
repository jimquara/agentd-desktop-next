import { Link } from "@tanstack/react-router";
import { T } from "gt-react";

export function JoinTeamScreen() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        <T>Join a team</T>
      </h1>
      <Link
        to="."
        search={{ screen: undefined }}
        hash={true}
        className="mt-5 inline-block text-sm underline"
      >
        <T>Back</T>
      </Link>
    </div>
  );
}
