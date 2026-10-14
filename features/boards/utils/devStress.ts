import { useStore, type Shape, type ShapeType } from "@/features/boards/store/useStore";

const COLORS = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7"];
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeShape(order: number, spread: number): Shape {
  const types: ShapeType[] = ["rect", "circle", "line", "arrow", "pen"];
  const type = types[Math.floor(Math.random() * types.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const isBox = type === "rect" || type === "circle";

  let points: number[] | undefined;
  if (type === "line" || type === "arrow") {
    points = [0, 0, rand(-150, 150), rand(-150, 150)];
  } else if (type === "pen") {
    points = [0, 0];
    let px = 0;
    let py = 0;
    for (let i = 0; i < 80; i++) {
      px += rand(-6, 6);
      py += rand(-6, 6);
      points.push(px, py);
    }
  }

  return {
    id: `stress-${crypto.randomUUID()}`,
    type,
    order,
    x: rand(-spread, spread),
    y: rand(-spread, spread),
    width: isBox ? rand(30, 160) : 0,
    height: isBox ? rand(30, 160) : 0,
    rotation: 0,
    fill: isBox ? color : "transparent",
    stroke: color,
    strokeWidth: 3,
    points,
  };
}

export function installStressTools() {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_ENABLE_STRESS !== "true") return;

  (window as any).stress = (count = 1000, spread = 4000) => {
    const start = useStore.getState().getNextOrder();
    const added = Array.from({ length: count }, (_, i) => makeShape(start + i, spread));
    useStore.setState((s) => ({ shapes: [...s.shapes, ...added] }));
    console.log(`Added ${count} stress shapes (spread ±${spread})`);
  };

  (window as any).stressClear = () => {
    useStore.setState((s) => ({
      shapes: s.shapes.filter((sh) => !sh.id.startsWith("stress-")),
      selectedIds: [],
    }));
    console.log("Stress shapes removed");
  };
}