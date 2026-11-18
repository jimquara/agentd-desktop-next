import { ClientSettingsSchema } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { installAgentdAfterConsent } from "../../backend/agentdInstall.ts";
import { applyLanguage } from "../../i18n/messages.ts";
import * as DesktopClientSettings from "../../settings/DesktopClientSettings.ts";
import * as DesktopSnapShot from "../../snapShot/DesktopSnapShot.ts";
import * as IpcChannels from "../channels.ts";
import * as DesktopIpc from "../DesktopIpc.ts";

export const getClientSettings = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.GET_CLIENT_SETTINGS_CHANNEL,
  payload: Schema.Void,
  result: Schema.NullOr(ClientSettingsSchema),
  handler: Effect.fn("desktop.ipc.clientSettings.get")(function* () {
    const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
    return Option.getOrNull(yield* clientSettings.get);
  }),
});

export const setClientSettings = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.SET_CLIENT_SETTINGS_CHANNEL,
  payload: ClientSettingsSchema,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.clientSettings.set")(function* (settings) {
    const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
    const snapShot = yield* DesktopSnapShot.DesktopSnapShot;
    const before = Option.getOrNull(
      yield* clientSettings.get.pipe(Effect.orElseSucceed(Option.none)),
    );
    yield* clientSettings.set(settings);
    // First-run consent was just given: install agentd and its Skills now, not before.
    if (before?.onboardingCompletedAt == null && settings.onboardingCompletedAt != null) {
      yield* Effect.forkDetach(installAgentdAfterConsent());
    }
    yield* snapShot.configure(settings);
    yield* applyLanguage(settings.language);
  }),
});
