import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ShapeType } from "@prisma/client";

export type ShapeCreateInput = {
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  points?: number[];
  order?: number;
  text?: string;
  fontSize?: number; 
};

export type ShapeUpdateInput = Partial<Omit<ShapeCreateInput, "type">>;

export type BatchInput = {
  id?: string;
} & Partial<ShapeCreateInput>;

const BATCH_CHUNK = 1000;

const fin = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}


export async function getShapesByBoardId(boardId: string) {
  return prisma.shape.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
  });
}

export async function getShapeById(shapeId: string, boardId: string) {
  return prisma.shape.findFirst({
    where: { id: shapeId, boardId },
  });
}

export async function createShape(
  boardId: string,
  userId: string,
  data: ShapeCreateInput,
) {
  const shape = await prisma.shape.create({
    data: {
      boardId,
      lastEditedBy: userId,
      type: data.type,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      rotation: data.rotation ?? 0,
      fill: data.fill,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      points: data.points ?? [],
      order: data.order ?? 0,
      text: data.text ?? null,
      fontSize: data.fontSize ?? null,
    },
  });

  await prisma.board.update({
    where: { id: boardId },
    data: { updatedAt: new Date() },
  });

  return shape;
}

export async function updateShape(
  shapeId: string,
  userId: string,
  data: ShapeUpdateInput,
) {
  return prisma.shape.update({
    where: { id: shapeId },
    data: {
      ...(data.x !== undefined && { x: data.x }),
      ...(data.y !== undefined && { y: data.y }),
      ...(data.width !== undefined && { width: data.width }),
      ...(data.height !== undefined && { height: data.height }),
      ...(data.rotation !== undefined && { rotation: data.rotation }),
      ...(data.fill !== undefined && { fill: data.fill }),
      ...(data.stroke !== undefined && { stroke: data.stroke }),
      ...(data.strokeWidth !== undefined && { strokeWidth: data.strokeWidth }),
      ...(data.points !== undefined && { points: data.points }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.text !== undefined && { text: data.text }),           // NEW
      ...(data.fontSize !== undefined && { fontSize: data.fontSize }), // NEW
      lastEditedBy: userId,
    },
  });
}

export async function deleteShape(shapeId: string) {
  return prisma.shape.delete({ where: { id: shapeId } });
}

export async function batchUpsertShapes(
  boardId: string,
  userId: string,
  shapes: BatchInput[],
  deletedIds: string[],
) {
  // One entry per id, later values win
  const byId = new Map<string, BatchInput>();
  for (const s of shapes) {
    if (!s.id) continue;
    byId.set(s.id, { ...(byId.get(s.id) ?? {}), ...s });
  }
  const all = Array.from(byId.values());
  const full = all.filter((s) => s.type !== undefined);
  const partial = all.filter((s) => s.type === undefined);
  const partialWithPoints = partial.filter((s) => s.points !== undefined);
  const partialPlain = partial.filter((s) => s.points === undefined);

  return prisma.$transaction(
    async (tx) => {
      if (deletedIds.length > 0) {
        await tx.shape.deleteMany({ where: { id: { in: deletedIds }, boardId } });
      }

      // New or fully re-sent shapes: replace the rows
      if (full.length > 0) {
        await tx.shape.deleteMany({
          where: { id: { in: full.map((s) => s.id as string) }, boardId },
        });
        const rows: Prisma.ShapeCreateManyInput[] = full.map((s) => ({
          id: s.id as string,
          boardId,
          lastEditedBy: userId,
          type: s.type as ShapeType,
          x: s.x ?? 0,
          y: s.y ?? 0,
          width: s.width ?? 0,
          height: s.height ?? 0,
          rotation: s.rotation ?? 0,
          fill: s.fill ?? "#000000",
          stroke: s.stroke ?? "#000000",
          strokeWidth: s.strokeWidth ?? 1,
          points: s.points ?? [],
          order: s.order ?? 0,
          text: s.text ?? null,
          fontSize: s.fontSize ?? null,
        }));
        for (const part of chunk(rows, BATCH_CHUNK)) {
          await tx.shape.createMany({ data: part });
        }
      }

      // Partial updates without points: one statement per chunk
      for (const part of chunk(partialPlain, BATCH_CHUNK)) {
        const payload = JSON.stringify(
          part.map((s) => {
            const ord = fin(s.order);
            return {
              id: s.id,
              x: fin(s.x),
              y: fin(s.y),
              w: fin(s.width),
              h: fin(s.height),
              rot: fin(s.rotation),
              fill: str(s.fill),
              stroke: str(s.stroke),
              sw: fin(s.strokeWidth),
              ord: ord === null ? null : Math.round(ord),
              txt: str(s.text),
              fs: fin(s.fontSize),
            };
          }),
        );

        await tx.$executeRaw`
          UPDATE "Shape" AS s SET
            "x" = COALESCE(v.x, s."x"),
            "y" = COALESCE(v.y, s."y"),
            "width" = COALESCE(v.w, s."width"),
            "height" = COALESCE(v.h, s."height"),
            "rotation" = COALESCE(v.rot, s."rotation"),
            "fill" = COALESCE(v.fill, s."fill"),
            "stroke" = COALESCE(v.stroke, s."stroke"),
            "strokeWidth" = COALESCE(v.sw, s."strokeWidth"),
            "order" = COALESCE(v.ord, s."order"),
            "text" = COALESCE(v.txt, s."text"),
            "fontSize" = COALESCE(v.fs, s."fontSize"),
            "lastEditedBy" = ${userId},
            "updatedAt" = NOW()
          FROM jsonb_to_recordset(${payload}::jsonb) AS v(
            id text, x float8, y float8, w float8, h float8, rot float8,
            fill text, stroke text, sw float8, ord int, txt text, fs float8
          )
          WHERE s."id" = v.id AND s."boardId" = ${boardId}
        `;
      }

      // Partial updates that include points: rare, keep them simple
      for (const s of partialWithPoints) {
        await tx.shape.updateMany({
          where: { id: s.id as string, boardId },
          data: {
            lastEditedBy: userId,
            points: s.points,
            ...(s.x !== undefined && { x: s.x }),
            ...(s.y !== undefined && { y: s.y }),
            ...(s.width !== undefined && { width: s.width }),
            ...(s.height !== undefined && { height: s.height }),
            ...(s.rotation !== undefined && { rotation: s.rotation }),
            ...(s.strokeWidth !== undefined && { strokeWidth: s.strokeWidth }),
            ...(s.order !== undefined && { order: s.order }),
          },
        });
      }

      await tx.board.update({ where: { id: boardId }, data: { updatedAt: new Date() } });
    },
    { timeout: 20000, maxWait: 5000 },
  );
}