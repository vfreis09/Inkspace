import { prisma } from "@/lib/prisma";
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
};

export type ShapeUpdateInput = Partial<Omit<ShapeCreateInput, "type">>;

export type BatchInput = {
  id?: string;
} & ShapeCreateInput;

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
      lastEditedBy: userId,
    },
  });
}

export async function deleteShape(shapeId: string) {
  return prisma.shape.delete({ where: { id: shapeId } });
}

// Called by the batch route — PartyKit will use this as its persistence sink
export async function batchUpsertShapes(
  boardId: string,
  userId: string,
  shapes: BatchInput[],
  deletedIds: string[],
) {
  return prisma.$transaction(async (tx) => {
    if (deletedIds.length > 0) {
      await tx.shape.deleteMany({
        where: { id: { in: deletedIds }, boardId },
      });
    }

    for (const shape of shapes) {
      const payload = {
        type: shape.type,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rotation: shape.rotation ?? 0,
        fill: shape.fill,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth,
        points: shape.points ?? [],
        order: shape.order ?? 0,
        lastEditedBy: userId,
      };

      if (shape.id) {
        await tx.shape.upsert({
          where: { id: shape.id },
          update: payload,
          create: { id: shape.id, boardId, ...payload },
        });
      } else {
        await tx.shape.create({ data: { boardId, ...payload } });
      }
    }

    await tx.board.update({
      where: { id: boardId },
      data: { updatedAt: new Date() },
    });
  });
}
