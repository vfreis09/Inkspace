
import { describe, expect, it } from "vitest";
import type { Shape } from "@/features/boards/store/useStore";
import { computeReorder } from "./layerOrder";

function makeShape(id: string, order: number): Shape {
  return {
    id,
    type: "rect",
    order,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 1,
  };
}

function getFinalOrder(
  shapes: Shape[],
  changes: ReturnType<typeof computeReorder>,
): string[] {
  const updatedOrders = new Map(
    changes.map((change) => [change.id, change.newOrder]),
  );

  return [...shapes]
    .sort(
      (a, b) =>
        (updatedOrders.get(a.id) ?? a.order) -
        (updatedOrders.get(b.id) ?? b.order),
    )
    .map((shape) => shape.id);
}

describe("computeReorder", () => {
  const shapes = [
    makeShape("a", 1),
    makeShape("b", 2),
    makeShape("c", 3),
    makeShape("d", 4),
  ];

  it("moves a selected shape to the front", () => {
    const changes = computeReorder(shapes, ["b"], "front");

    expect(getFinalOrder(shapes, changes)).toEqual([
      "a", "c", "d", "b",
    ]);
  });

  it("moves a selected shape to the back", () => {
    const changes = computeReorder(shapes, ["c"], "back");

    expect(getFinalOrder(shapes, changes)).toEqual([
      "c", "a", "b", "d",
    ]);
  });

  it("moves a selected shape forward by one position", () => {
    const changes = computeReorder(shapes, ["b"], "forward");

    expect(getFinalOrder(shapes, changes)).toEqual([
      "a", "c", "b", "d",
    ]);
  });

  it("moves a selected shape backward by one position", () => {
    const changes = computeReorder(shapes, ["c"], "backward");

    expect(getFinalOrder(shapes, changes)).toEqual([
      "a", "c", "b", "d",
    ]);
  });

  it("preserves the relative order of multiple selected shapes", () => {
    const changes = computeReorder(shapes, ["a", "c"], "front");

    expect(getFinalOrder(shapes, changes)).toEqual([
      "b", "d", "a", "c",
    ]);
  });

  it("returns no changes when the selected shapes are already at the front", () => {
    const changes = computeReorder(shapes, ["c", "d"], "front");

    expect(changes).toEqual([]);
  });

  it("returns no changes when nothing is selected", () => {
    const changes = computeReorder(shapes, [], "front");

    expect(changes).toEqual([]);
  });

  it("does not mutate the original shapes array", () => {
    const original = [...shapes];

    computeReorder(shapes, ["b"], "front");

    expect(shapes).toEqual(original);
  });

  
  it("uses the ID as a tie-breaker when shapes have equal orders", () => {
    const tiedShapes = [
      makeShape("c", 1),
      makeShape("a", 1),
      makeShape("b", 1),
    ];

    const changes = computeReorder(tiedShapes, [], "front");

    expect(changes).toEqual([
      { id: "b", oldOrder: 1, newOrder: 2 },
      { id: "c", oldOrder: 1, newOrder: 3 },
    ]);
  });

  it("ignores selected IDs that do not exist", () => {
    const changes = computeReorder(shapes, ["missing-id"], "front");

    expect(changes).toEqual([]);
  });
});
