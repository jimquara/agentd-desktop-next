import { T, useGT } from "gt-react";
import { CodeXmlIcon, MessageCircleIcon } from "lucide-react";

import { setChatCodeMode, useChatCodeMode } from "../../chatCodeModeStore";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export function ChatCodeSwitch({ threadKey }: { threadKey: string | null }) {
  const gt = useGT();
  const mode = useChatCodeMode(threadKey);
  return (
    <div className="shrink-0 px-3 pb-2">
      <ToggleGroup
        aria-label={gt("Session view")}
        data-chat-code-switch
        disabled={threadKey === null}
        value={threadKey === null ? [] : [mode]}
        onValueChange={([value]) => {
          if (threadKey !== null && (value === "chat" || value === "code")) {
            setChatCodeMode(threadKey, value);
          }
        }}
      >
        <ToggleGroupItem value="chat">
          <MessageCircleIcon />
          <T context="session mode showing only the conversation">Chat</T>
        </ToggleGroupItem>
        <ToggleGroupItem value="code">
          <CodeXmlIcon />
          <T context="session mode showing the coding workspace">Code</T>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
