"use client";

import { ArrowDown, ArrowUp, BringToFront, SendToBack } from "lucide-react";
import { useStore } from "@/features/boards/store/useStore";

export default function LayerControls({ canEdit = true }: { canEdit?: boolean }) {
  const hasSelection = useStore((s) => s.selectedIds.length > 0);
  const reorderSelected = useStore((s) => s.reorderSelected);

  if (!canEdit || !hasSelection) return null;

  const actions = [
    { mode: "front", icon: BringToFront, label: "Bring to front (Ctrl+Shift+])" },
    { mode: "forward", icon: ArrowUp, label: "Bring forward (Ctrl+])" },
    { mode: "backward", icon: ArrowDown, label: "Send backward (Ctrl+[)" },
    { mode: "back", icon: SendToBack, label: "Send to back (Ctrl+Shift+[)" },
  ] as const;

  return (
    <div className="fixed left-1/2 top-6 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-[#2c2c2c] rounded-xl shadow-2xl border border-white/10 z-50">
      {actions.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          title={label}
          onClick={() => reorderSelected(mode)}
          className="p-2.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}