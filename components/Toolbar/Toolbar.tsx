"use client";

import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Minus,
  MoveRight,
  Palette,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import type { Tool } from "@/store/useStore";
import { cn } from "@/lib/utils";

export default function Toolbar() {
  const currentTool = useStore((state) => state.currentTool);
  const setTool = useStore((state) => state.setTool);
  const isColorPickerOpen = useStore((state) => state.isColorPickerOpen);
  const toggleColorPicker = useStore((state) => state.toggleColorPicker);

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select (V)" },
    { id: "pan", icon: Hand, label: "Pan (H)" },
    { id: "rect", icon: Square, label: "Rectangle (R)" },
    { id: "circle", icon: Circle, label: "Circle (O)" },
    { id: "line", icon: Minus, label: "Line (L)" },
    { id: "arrow", icon: MoveRight, label: "Arrow (A)" },
  ];

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 p-2 bg-[#2c2c2c] rounded-2xl shadow-2xl border border-white/10 z-50">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = currentTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => setTool(tool.id)}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative",
              isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
            )}
            title={tool.label}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="absolute left-14 scale-0 group-hover:scale-100 transition-transform origin-left bg-black text-white text-xs px-2 py-1 rounded md:block hidden whitespace-nowrap">
              {tool.label}
            </span>
          </button>
        );
      })}
      <div className="w-8 h-[1px] bg-white/10 my-1" />
      <button
        onClick={toggleColorPicker}
        className={cn(
          "p-3 rounded-xl transition-all duration-200",
          isColorPickerOpen
            ? "bg-indigo-600/20 text-indigo-400"
            : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
        )}
      >
        <Palette size={20} />
      </button>
    </div>
  );
}
