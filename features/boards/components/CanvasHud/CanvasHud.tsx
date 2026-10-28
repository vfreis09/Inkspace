"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import {
  formatZoom,
  parseCoordinate,
  parseZoomPercent,
} from "@/features/boards/utils/cameraMath";

export type CanvasHudHandle = {
  setPointer: (x: number, y: number) => void;
};

type CanvasHudProps = {
  scale: number;
  center: { x: number; y: number };
  onSetZoom: (scale: number) => void;
  onGoTo: (x: number, y: number) => void;
};

type Field = "zoom" | "x" | "y";

const inputClass =
  "w-14 rounded border border-white/10 bg-transparent px-1 py-0.5 text-center font-mono text-[11px] text-zinc-300 outline-none focus:border-indigo-500";

const CanvasHud = forwardRef<CanvasHudHandle, CanvasHudProps>(function CanvasHud(
  { scale, center, onSetZoom, onGoTo },
  ref,
) {
  const coordsRef = useRef<HTMLSpanElement>(null);
  const skipCommitRef = useRef(false);
  const [draft, setDraft] = useState<{ field: Field; value: string } | null>(null);

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

  const commit = (field: Field, display: string) => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      setDraft(null);
      return;
    }
    if (!draft || draft.field !== field) return;

    const text = draft.value.trim();
    setDraft(null);
    if (text === display) return; // untouched, don't nudge the view by rounding

    if (field === "zoom") {
      const s = parseZoomPercent(text);
      if (s !== null) onSetZoom(s);
      return;
    }
    const n = parseCoordinate(text);
    if (n === null) return;
    if (field === "x") onGoTo(n, center.y);
    else onGoTo(center.x, n);
  };

  const fieldProps = (field: Field, display: string) => ({
    value: draft?.field === field ? draft.value : display,
    onFocus: (e: FocusEvent<HTMLInputElement>) => {
      setDraft({ field, value: display });
      e.currentTarget.select();
    },
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      setDraft({ field, value: e.target.value }),
    onBlur: () => commit(field, display),
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        skipCommitRef.current = true;
        e.currentTarget.blur();
      }
    },
    inputMode: "decimal" as const,
    className: inputClass,
  });

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/90 px-3 py-1.5 font-mono text-[11px] text-zinc-400 backdrop-blur-md">
      <label className="flex items-center gap-1" title="Zoom: type a percentage and press Enter">
        <input aria-label="Zoom percentage" {...fieldProps("zoom", formatZoom(scale))} />
        <span>%</span>
      </label>
      <span className="text-zinc-700">|</span>
      <span ref={coordsRef} className="inline-block min-w-[18ch] text-center" title="Pointer position">
        x: 0, y: 0
      </span>
      <span className="text-zinc-700">|</span>
      <div
        className="flex items-center gap-1"
        title="View center: type coordinates and press Enter to jump there"
      >
        <span className="text-zinc-500">center</span>
        <input aria-label="View center x" {...fieldProps("x", String(Math.round(center.x)))} />
        <input aria-label="View center y" {...fieldProps("y", String(Math.round(center.y)))} />
      </div>
    </div>
  );
});

export default CanvasHud;