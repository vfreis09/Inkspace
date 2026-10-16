"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type CanvasHudHandle = {
  setPointer: (x: number, y: number) => void;
};

const CanvasHud = forwardRef<CanvasHudHandle, { scale: number }>(
  function CanvasHud({ scale }, ref) {
    const coordsRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        setPointer: (x, y) => {
          if (coordsRef.current) {
            coordsRef.current.textContent = `x: ${Math.round(x)}, y: ${Math.round(y)}`;
          }
        },
      }),
      [],
    );

    return (
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-1.5 font-mono text-[11px] text-zinc-400 backdrop-blur-md">
        <span>{Math.round(scale * 100)}%</span>
        <span className="text-zinc-700">|</span>
        <span ref={coordsRef}>x: 0, y: 0</span>
      </div>
    );
  },
);

export default CanvasHud;