import { T, useGT } from "gt-react";
import { CodeXmlIcon, MessageCircleIcon } from "lucide-react";

import type { SidebarTab } from "../../sidebarTabStore";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

export function SidebarTabSwitch({
  tab,
  onSelect,
}: {
  tab: SidebarTab;
  onSelect: (tab: SidebarTab) => void;
}) {
  const gt = useGT();
  return (
    <div className="shrink-0 px-3 pb-2">
      <ToggleGroup
        aria-label={gt("Sidebar tab")}
        data-sidebar-tab-switch
        value={[tab]}
        onValueChange={([value]) => {
          if ((value === "chat" || value === "code") && value !== tab) onSelect(value);
        }}
      >
        <ToggleGroupItem value="chat">
          <MessageCircleIcon />
          <T context="sidebar tab listing conversations without a project">Chat</T>
        </ToggleGroupItem>
        <ToggleGroupItem value="code">
          <CodeXmlIcon />
          <T context="sidebar tab listing coding sessions in projects">Code</T>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
