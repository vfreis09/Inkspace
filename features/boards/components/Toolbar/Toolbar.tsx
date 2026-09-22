"use client";

import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Minus,
  MoveRight, 
  Pen,
  Palette,
} from "lucide-react";
import { useStore } from "@/features/boards/store/useStore";
import type { Tool } from "@/features/boards/store/useStore";
import { cn } from "@/lib/utils";

export default function Toolbar({ canEdit = true }: { canEdit?: boolean }) {
  const currentTool = useStore((state) => state.currentTool);
  const setTool = useStore((state) => state.setTool);
  const isColorPickerOpen = useStore((state) => state.isColorPickerOpen);
  const toggleColorPicker = useStore((state) => state.toggleColorPicker);

  const tools: {
    id: Tool;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    label: string;
    editOnly?: boolean;
  }[] = [
    { id: "select", icon: MousePointer2, label: "Select (V)" },
    { id: "pan", icon: Hand, label: "Pan (H)" },
    { id: "rect", icon: Square, label: "Rectangle (R)", editOnly: true },
    { id: "circle", icon: Circle, label: "Circle (O)", editOnly: true },
    { id: "line", icon: Minus, label: "Line (L)", editOnly: true },
    { id: "arrow", icon: MoveRight, label: "Arrow (A)", editOnly: true },
    { id: "pen", icon: Pen, label: "Pen (P)", editOnly: true },
  ];

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 p-2 bg-[#2c2c2c] rounded-2xl shadow-2xl border border-white/10 z-50">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;
        const disabled = tool.editOnly && !canEdit;
        return (
          <button
            key={tool.id}
            onClick={() => !disabled && setTool(tool.id)}
            disabled={disabled}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative",
              disabled
                ? "text-gray-600 opacity-40 cursor-not-allowed"
                : isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
            )}
            title={disabled ? "Viewers can't edit" : tool.label}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="absolute left-14 scale-0 group-hover:scale-100 transition-transform origin-left bg-black text-white text-xs px-2 py-1 rounded md:block hidden whitespace-nowrap">
              {disabled ? "Viewers can't edit" : tool.label}
            </span>
          </button>
        );
      })}
      <div className="w-8 h-[1px] bg-white/10 my-1" />
      <button
        onClick={toggleColorPicker}
        disabled={!canEdit}
        className={cn(
          "p-3 rounded-xl transition-all duration-200",
          !canEdit
            ? "text-gray-600 opacity-40 cursor-not-allowed"
            : isColorPickerOpen
              ? "bg-indigo-600/20 text-indigo-400"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
        )}
      >
        <Palette size={20} />
      </button>
    </div>
  );
}