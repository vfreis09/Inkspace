"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import PartySocket from "partysocket";
import { useUser } from "@clerk/nextjs";
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
  avatarUrl?: string;
  color: string;
  x: number;
  y: number;
};

export function getGuestIdentity() {
  const stored = localStorage.getItem("guest_identity");
  if (stored) return JSON.parse(stored);
  const identity = {
    id: `guest_${crypto.randomUUID()}`,
    name: `Guest #${Math.floor(Math.random() * 9000) + 1000}`,
  };
  localStorage.setItem("guest_identity", JSON.stringify(identity));
  return identity;
}

export function usePartyKit(
  boardId: string,
  onCursorUpdate: (cursors: RemoteCursor[]) => void,
) {
  const { user } = useUser();
  const socketRef = useRef<PartySocket | null>(null);
  const cursorsRef = useRef<Map<string, RemoteCursor>>(new Map());
  const [activeUsers, setActiveUsers] = useState<RemoteCursor[]>([]);

  const lastCursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const cursorFrameRef = useRef<number | null>(null);

  const { addShapeFromRemote, updateShapeFromRemote, deleteShapesFromRemote } =
    useStore();

  const guestIdentity = useMemo(() => {
    if (typeof window === "undefined") return null;
    return user ? null : getGuestIdentity();
  }, [user]);

  const userId = user?.id ?? guestIdentity?.id ?? null;
  const userName =
    user?.fullName ?? user?.username ?? guestIdentity?.name ?? "Anonymous";
  const avatarUrl = user?.imageUrl;
  const isGuest = !user;

  const [guestName, setGuestNameState] = useState(guestIdentity?.name ?? "");

  const setGuestName = useCallback(
    (name: string) => {
      if (!guestIdentity) return;
      const updated = { ...guestIdentity, name };
      localStorage.setItem("guest_identity", JSON.stringify(updated));
      setGuestNameState(name);
      socketRef.current?.send(
        JSON.stringify({
          type: "user:rename",
          name,
        }),
      );
    },
    [guestIdentity],
  );

  const emitPresence = useCallback(() => {
    const allCursors = Array.from(cursorsRef.current.values());

    const byUser = new Map<string, RemoteCursor>();
    for (const c of allCursors) {
      byUser.set(c.userId, c);
    }
    const uniqueUsers = Array.from(byUser.values());

    const othersOnly = uniqueUsers.filter(
      (c) => (userId && c.userId !== userId) || !userId,
    );

    onCursorUpdate(othersOnly);
    setActiveUsers(uniqueUsers);
  }, [onCursorUpdate, userId]);

  useEffect(() => {
    if (!boardId || !userId) return;

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: boardId,
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "user:join",
          userId,
          name: guestName || userName,
          avatarUrl,
          color: userColor(userId),
          isGuest,
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
          emitPresence();
          break;

        case "user:join":
          cursorsRef.current.set(msg.connectionId, {
            connectionId: msg.connectionId,
            userId: msg.userId,
            name: msg.name,
            avatarUrl: msg.avatarUrl,
            color: msg.color,
            x: 0,
            y: 0,
          });
          emitPresence();
          break;

        case "cursor:leave":
          cursorsRef.current.delete(msg.connectionId);
          emitPresence();
          break;

        case "cursor:move":
          const existing = cursorsRef.current.get(msg.connectionId);
          if (existing) {
            existing.x = msg.x;
            existing.y = msg.y;
          }
          emitPresence();
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

        case "user:rename":
          const toRename = cursorsRef.current.get(msg.connectionId);
          if (toRename) {
            toRename.name = msg.name;
            emitPresence();
          }
          break;
      }
    });

    return () => socket.close();
  }, [
    boardId,
    user,
    addShapeFromRemote,
    updateShapeFromRemote,
    deleteShapesFromRemote,
    emitPresence,
  ]);

  const flushCursor = useCallback(() => {
    if (!socketRef.current || !lastCursorPositionRef.current) {
      cursorFrameRef.current = null;
      return;
    }
    const { x, y } = lastCursorPositionRef.current;
    socketRef.current.send(JSON.stringify({ type: "cursor:move", x, y }));
    cursorFrameRef.current = null;
  }, []);

  const sendCursor = useCallback(
    (x: number, y: number) => {
      lastCursorPositionRef.current = { x, y };
      if (cursorFrameRef.current == null) {
        cursorFrameRef.current = requestAnimationFrame(flushCursor);
      }
    },
    [flushCursor],
  );

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
    activeUsers,
    isGuest,
    guestName,
    setGuestName,
    sendCursor,
    sendShapeAdd,
    sendShapeUpdate,
    sendShapeDelete,
    sendFullSync,
  };
}
