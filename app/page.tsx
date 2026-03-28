"use client";
import dynamic from "next/dynamic";

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
      <div className="absolute top-4 left-4 z-10 rounded-lg bg-zinc-900/80 p-2 text-white backdrop-blur-md border border-zinc-800">
        <h1 className="text-sm font-bold">Inkspace Engine v0.1</h1>
        <p className="text-xs opacity-60">Scroll to zoom • Drag to pan</p>
      </div>

      <Canvas />
    </main>
  );
}
