"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Palette, X, Sparkles, Pencil } from "lucide-react";
import { useStore } from "@/store/useStore";

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  if (!hex || hex === "transparent" || !hex.startsWith("#")) {
    return { h: 239, s: 0.58, v: 0.95 };
  }

  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

const PALETTE = [
  { color: "#ffffff" },
  { color: "#6b7280" },
  { color: "#1f2937" },
  { color: "#92400e" },
  { color: "#0d9488" },
  { color: "#2563eb" },
  { color: "#4f46e5" },
  { color: "#db2777" },
  { color: "#16a34a" },
  { color: "#15803d" },
  { color: "#0891b2" },
  { color: "#ca8a04" },
  { color: "#ea580c" },
  { color: "#ef4444" },
  { color: "#a855f7" },
  { color: "#ec4899" },
  { color: "#f59e0b" },
  { color: "#84cc16" },
  { color: "#06b6d4" },
];

type ColorPickerProps = { onClose?: () => void };

export default function ColorPicker({ onClose }: ColorPickerProps) {
  const activeFill = useStore((state) => state.activeFill);
  const activeStroke = useStore((state) => state.activeStroke);
  const activeTarget = useStore((state) => state.activeTarget);
  const setActiveTarget = useStore((state) => state.setActiveTarget);
  const setTargetColor = useStore((state) => state.setTargetColor);
  const brushSize = useStore((state) => state.brushSize);
  const setBrushSize = useStore((state) => state.setBrushSize);

  const currentColor = activeTarget === "fill" ? activeFill : activeStroke;

  const hsv = useMemo(
    () => hexToHsv(currentColor.startsWith("#") ? currentColor : "#6366f1"),
    [currentColor],
  );
  const [hexInput, setHexInput] = useState(currentColor);
  const [hexError, setHexError] = useState<string | null>(null);

  const gradientRef = useRef<HTMLCanvasElement>(null);
  const isDraggingGradient = useRef(false);

  const drawGradient = useCallback(() => {
    const canvas = gradientRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const [hr, hg, hb] = hsvToRgb(hsv.h, 1, 1);
    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    gradH.addColorStop(0, "#ffffff");
    gradH.addColorStop(1, `rgb(${hr},${hg},${hb})`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);
    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
  }, [hsv.h]);

  useEffect(() => {
    drawGradient();
  }, [drawGradient]);

  const applyHsv = useCallback(
    (newHsv: { h: number; s: number; v: number }) => {
      const [r, g, b] = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
      const hex = rgbToHex(r, g, b);
      setHexInput(hex);

      setTargetColor(hex);

      if (activeTarget === "fill") {
        useStore.getState().setTargetColor(hex, "stroke");
      }
    },
    [setTargetColor, activeTarget],
  );

  const getGradientSV = (
    e: React.MouseEvent | MouseEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    return {
      s: Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1)),
      v: Math.max(0, Math.min(1 - (e.clientY - rect.top) / rect.height, 1)),
    };
  };

  const handleGradientMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingGradient.current = true;
    const { s, v } = getGradientSV(e, e.currentTarget);
    applyHsv({ ...hsv, s, v });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingGradient.current || !gradientRef.current) return;
      const { s, v } = getGradientSV(e, gradientRef.current);
      applyHsv({ ...hsv, s, v });
    };
    const onUp = () => {
      isDraggingGradient.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [hsv, applyHsv]);

  const applyHex = () => {
    const normalized = hexInput.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
      setHexError(null);
      const hex = `#${normalized.toLowerCase()}`;
      setTargetColor(hex);

      if (activeTarget === "fill") {
        useStore.getState().setTargetColor(hex, "stroke");
      }
    } else {
      setHexError("Invalid hex");
    }
  };

  return (
    <div className="relative flex w-64 flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-md">
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <Palette size={12} /> Color + Pencil
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-1 text-xs">
        <button
          className={`flex-1 rounded px-2 py-1 flex items-center justify-center gap-1 ${activeTarget === "fill" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          onClick={() => setActiveTarget("fill")}
        >
          <Sparkles size={11} /> fill
        </button>
        <button
          className={`flex-1 rounded px-2 py-1 flex items-center justify-center gap-1 ${activeTarget === "stroke" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          onClick={() => setActiveTarget("stroke")}
        >
          <Pencil size={11} /> stroke
        </button>
      </div>
      <div
        className="relative w-full rounded-lg overflow-hidden"
        style={{ height: 140 }}
      >
        <canvas
          ref={gradientRef}
          width={232}
          height={140}
          className="w-full h-full cursor-crosshair"
          onMouseDown={handleGradientMouseDown}
        />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>
      <div className="px-0.5">
        <input
          type="range"
          min={0}
          max={360}
          value={hsv.h}
          onChange={(e) => applyHsv({ ...hsv, h: Number(e.target.value) })}
          className="w-full h-3 rounded-full cursor-pointer appearance-none"
          style={{
            background:
              "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          }}
        />
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5">
        <span className="text-xs text-zinc-500 mr-1">Brush</span>
        {[2, 3, 5, 8, 12].map((s) => (
          <button
            key={s}
            onClick={() => setBrushSize(s)}
            className={`rounded px-1.5 py-0.5 text-xs font-mono ${brushSize === s ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {PALETTE.map(({ color }) => (
          <button
            key={color}
            onClick={() => {
              setTargetColor(color);
              setHexInput(color);
              if (activeTarget === "fill") {
                useStore.getState().setTargetColor(color, "stroke");
              }
            }}
            className={`h-9 w-full rounded-lg transition-all active:scale-90 ${
              currentColor === color
                ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-105"
                : "hover:scale-105"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-black/20 px-2 py-1.5">
        <div
          className="h-4 w-4 flex-shrink-0 rounded border border-white/10"
          style={{
            backgroundColor:
              currentColor === "transparent" ? "transparent" : currentColor,
          }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyHex()}
          className="flex-1 min-w-0 rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
        />
        <button
          onClick={applyHex}
          className="flex-shrink-0 rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-indigo-500"
        >
          ↵
        </button>
      </div>
      {hexError && <p className="text-[10px] text-rose-400 px-1">{hexError}</p>}
    </div>
  );
}
