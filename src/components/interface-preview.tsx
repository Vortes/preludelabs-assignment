"use client";
import { useLensMotion } from "./interface/lens-motion";
import { useState } from "react";
import { AppShell } from "./app-shell";
import { ConversationPanel } from "./interface/conversation-panel";
import { WorkspaceNavigation } from "./interface/workspace-navigation";
import { WorkspaceFooter } from "./interface/workspace-footer";
export function InterfacePreview() {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [instantSelection, setInstantSelection] = useState(false);
  const [instantMotion, setInstantMotion] = useState(false);
  const motion = useLensMotion(expanded, instantMotion);
  return (
    <AppShell
      selectedLens={selected}
      motion={motion}
      sidebar={<ConversationPanel />}
      navigation={<WorkspaceNavigation />}
      instantSelection={instantSelection}
      footer={
        <WorkspaceFooter
          selected={selected}
          expanded={motion.open}
          onSelect={(index, instant = false) => {
            setInstantSelection(instant);
            setSelected(index);
          }}
          onExpand={(open, instant = false) => {
            setInstantMotion(instant);
            setExpanded(open);
          }}
        />
      }
    />
  );
}
