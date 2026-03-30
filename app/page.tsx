"use client";
import dynamic from "next/dynamic";
import Toolbar from "@/components/Toolbar/Toolbar";

const Canvas = dynamic(() => import("../components/Canvas/Canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-white">
      Loading Engine...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden bg-[#fdfdfb]">
      <div className="absolute left-4 top-4 z-10 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 text-white backdrop-blur-md">
        <h1 className="text-sm font-bold">Inkspace Engine v0.2</h1>
        <p className="text-xs opacity-60">
          Scroll to zoom • Drag to pan • Press keys to switch tools
        </p>
      </div>
      <Toolbar />
      <Canvas />
    </main>
  );
}
