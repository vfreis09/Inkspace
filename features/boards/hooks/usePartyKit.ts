"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import PartySocket from "partysocket";
import { useStore, Shape } from "@/features/boards/store/useStore";

function userColor(userId: string): string {
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#6366f1",
    "#a855f7",
    "#ec4899",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export type RemoteCursor = {
  connectionId: string;
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

export function usePartyKit(
  boardId: string,
  onCursorUpdate: (cursors: RemoteCursor[]) => void,
) {
  const mockUser = useMemo(() => {
    const id = `guest-${crypto.randomUUID().slice(0, 6)}`;
    return {
      id,
      name: `Guest`,
      color: userColor(id),
    };
  }, []);

  const socketRef = useRef<PartySocket | null>(null);
  const cursorsRef = useRef<Map<string, RemoteCursor>>(new Map());

  const { addShapeFromRemote, updateShapeFromRemote, deleteShapesFromRemote } =
    useStore();

  const emitCursors = useCallback(() => {
    onCursorUpdate(Array.from(cursorsRef.current.values()));
  }, [onCursorUpdate]);

  useEffect(() => {
    if (!boardId) return;

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: boardId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "user:join",
          userId: mockUser.id,
          name: mockUser.name,
          color: mockUser.color,
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "cursors:init":
          Object.entries(msg.cursors).forEach(([connId, c]: any) => {
            cursorsRef.current.set(connId, {
              connectionId: connId,
              ...c,
            });
          });
          emitCursors();
          break;

        case "user:join":
          cursorsRef.current.set(msg.connectionId, {
            connectionId: msg.connectionId,
            userId: msg.userId,
            name: msg.name,
            color: msg.color,
            x: 0,
            y: 0,
          });
          emitCursors();
          break;

        case "cursor:leave":
          cursorsRef.current.delete(msg.connectionId);
          emitCursors();
          break;

        case "cursor:move":
          const existing = cursorsRef.current.get(msg.connectionId);
          if (existing) {
            existing.x = msg.x;
            existing.y = msg.y;
          }
          emitCursors();
          break;

        case "shape:add":
          addShapeFromRemote(msg.shape);
          break;

        case "shape:update":
          updateShapeFromRemote(msg.shapeId, msg.props);
          break;

        case "shape:delete":
          deleteShapesFromRemote(msg.ids);
          break;

        case "shapes:sync":
          useStore.setState({ shapes: msg.shapes });
          break;
      }
    });

    return () => socket.close();
  }, [boardId, mockUser]);

  const sendCursor = useCallback((x: number, y: number) => {
    socketRef.current?.send(JSON.stringify({ type: "cursor:move", x, y }));
  }, []);

  const sendShapeAdd = useCallback((shape: object) => {
    socketRef.current?.send(JSON.stringify({ type: "shape:add", shape }));
  }, []);

  const sendShapeUpdate = useCallback((shapeId: string, props: object) => {
    socketRef.current?.send(
      JSON.stringify({ type: "shape:update", shapeId, props }),
    );
  }, []);

  const sendShapeDelete = useCallback((ids: string[]) => {
    socketRef.current?.send(JSON.stringify({ type: "shape:delete", ids }));
  }, []);

  const sendFullSync = useCallback((shapes: Shape[]) => {
    socketRef.current?.send(JSON.stringify({ type: "shapes:sync", shapes }));
  }, []);

  return {
    sendCursor,
    sendShapeAdd,
    sendShapeUpdate,
    sendShapeDelete,
    sendFullSync,
  };
}
