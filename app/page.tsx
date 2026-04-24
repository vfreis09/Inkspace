"use client";

import dynamic from "next/dynamic";
import Toolbar from "@/features/boards/components/Toolbar/Toolbar";
import ColorPicker from "@/features/boards/components/ColorPicker/ColorPicker";
import { useStore } from "@/features/boards/store/useStore";

const Canvas = dynamic(
  () => import("../features/boards/components/Canvas/Canvas"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-white">
        Loading Engine...
      </div>
    ),
  },
);

export default function Home() {
  const isColorPickerOpen = useStore((state) => state.isColorPickerOpen);
  const toggleColorPicker = useStore((state) => state.toggleColorPicker);

  return (
    <main className="h-screen w-full overflow-hidden bg-[#fdfdfb]">
      <div className="absolute left-4 top-4 z-10 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-white backdrop-blur-md">
        <h1 className="text-sm font-bold">Inkspace Engine v0.2</h1>
        <p className="text-xs opacity-60">
          Scroll to zoom • Drag to pan • Press keys to switch tools
        </p>
      </div>
      <Toolbar />
      {isColorPickerOpen && (
        <div className="fixed left-24 top-1/2 -translate-y-1/2 z-50">
          <ColorPicker onClose={toggleColorPicker} />
        </div>
      )}
      <Canvas />
    </main>
  );
}
