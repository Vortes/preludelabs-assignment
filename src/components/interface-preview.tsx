"use client";
import { useState } from "react";
import Image from "next/image";
import { AppShell } from "./app-shell";
import { ConversationPanel } from "./interface/conversation-panel";
import { WorkspaceNavigation } from "./interface/workspace-navigation";
import { InsightCallout } from "./interface/insight-callout";
import { WorkspaceFooter } from "./interface/workspace-footer";
export function InterfacePreview() {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  return (
    <AppShell
      selectedLens={selected}
      expanded={expanded}
      sidebar={<ConversationPanel />}
      navigation={<WorkspaceNavigation />}
      detail={<InsightCallout />}
      footer={<WorkspaceFooter selected={selected} expanded={expanded} onSelect={setSelected} onExpand={setExpanded} />}
    >
      <Image
        src="/figma/lens-artwork-hq.png"
        alt="Painting of women walking through the city"
        width={600}
        height={600}
        priority
      />
    </AppShell>
  );
}
