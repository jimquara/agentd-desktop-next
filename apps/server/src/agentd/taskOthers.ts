import type { AgentdDoctorJson, AgentdTaskOther, AgentdWhoJson } from "@t3tools/contracts";

const FINISHED_STATES = new Set(["done", "cancelled", "declined", "delivered"]);

export function joinedPerson(doctor: AgentdDoctorJson): string | null {
  const detail = doctor.checks.find((check) => check.id === "server")?.detail;
  return detail?.match(/(?:^|; )https?:\/\/\S+: device \S+ \(cli, person ([^)]+)\)/)?.[1] ?? null;
}

export function repositoryTargets(checkout: typeof AgentdWhoJson.Type): string[] {
  const match = /^tree:([^/@]+\/([^/@]+\/[^/@]+))@/.exec(checkout.resource ?? "");
  return match ? [match[2]!, `repo:${match[1]}#`] : [];
}

export function mergeTaskHolders(
  answers: ReadonlyArray<typeof AgentdWhoJson.Type>,
  self: { readonly local: ReadonlyArray<string | null | undefined>; readonly team: string },
): AgentdTaskOther[] {
  const holders = answers.flatMap((answer) => answer.holders ?? []);
  const finishedHandoffs = new Set(
    holders
      .filter((holder) => FINISHED_STATES.has(holder.state ?? ""))
      .map((holder) => holder.handoff),
  );
  const grouped = new Map<string, AgentdTaskOther>();
  for (const holder of holders) {
    if (
      FINISHED_STATES.has(holder.state ?? "") ||
      (holder.handoff && finishedHandoffs.has(holder.handoff))
    ) {
      continue;
    }
    const user = holder.user || null;
    if (
      user !== null &&
      (holder.via === "server" ? user === self.team : self.local.includes(user))
    ) {
      continue;
    }
    const resource = holder.resource ?? "";
    const person = user ?? (holder.session || holder.node || null);
    const work =
      holder.handoff ||
      holder.issue ||
      /^(?:issue:)?([\w.-]+\/[\w.-]+#[1-9]\d*)$/.exec(resource)?.[1] ||
      null;
    const activity = holder.activity || null;
    const path =
      /^repo:[^#]+#(.*)$/.exec(resource)?.[1] ||
      holder.path ||
      (/^(?:\/|[A-Za-z]:[\\/]|\\\\)/.test(resource) ? resource : null);
    const key = JSON.stringify([person, work, work === null ? activity : null]);
    const previous = grouped.get(key);
    const paths = previous?.paths ?? [];
    grouped.set(key, {
      person,
      work,
      activity: previous?.activity ?? activity,
      paths: path !== null && !paths.includes(path) ? [...paths, path] : paths,
    });
  }
  return [...grouped.values()];
}
