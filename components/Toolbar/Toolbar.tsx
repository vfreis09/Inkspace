"use client";

import { useStore } from "@/store/useStore";
import type { Tool } from "@/store/useStore";
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Minus,
  MoveRight,
  Hand,
} from "lucide-react";

const tools = [
  { id: "select", label: "Select", icon: MousePointer2, shortcut: "V" },
  { id: "rect", label: "Rectangle", icon: Square, shortcut: "R" },
  { id: "circle", label: "Circle", icon: CircleIcon, shortcut: "O" },
  { id: "line", label: "Line", icon: Minus, shortcut: "L" },
  { id: "arrow", label: "Arrow", icon: MoveRight, shortcut: "A" },
  { id: "pan", label: "Pan", icon: Hand, shortcut: "H" },
] as const;

export default function Toolbar() {
  const currentTool = useStore((state) => state.currentTool);
  const setTool = useStore((state) => state.setTool);

  return (
    <div className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-2 backdrop-blur-md">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id as Tool)}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-md transition-all ${
              currentTool === tool.id
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <Icon size={18} strokeWidth={2.5} />
            <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              {tool.label}{" "}
              <kbd className="ml-1 text-zinc-400">{tool.shortcut}</kbd>
            </span>
          </button>
        );
      })}
    </div>
  );
}
