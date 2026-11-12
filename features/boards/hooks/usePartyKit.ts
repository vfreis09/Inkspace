"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import PartySocket from "partysocket";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/features/boards/store/useStore";
import { apiFetchShapes } from "@/features/boards/services/boardApi";

type Role = "owner" | "editor" | "viewer";
export type ConnectionStatus = "connecting" | "online" | "offline";

const USER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
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

type CursorInitPayload = Omit<RemoteCursor, "connectionId">;

export function getGuestIdentity() {
  try {
    const stored = localStorage.getItem("guest_identity");
    if (stored) return JSON.parse(stored);
  } catch {
    /* fall through and create a new identity */
  }
  const identity = {
    id: `guest_${crypto.randomUUID()}`,
    name: `Guest #${Math.floor(Math.random() * 9000) + 1000}`,
  };
  try {
    localStorage.setItem("guest_identity", JSON.stringify(identity));
  } catch {
    /* storage unavailable: identity lives for this page only */
  }
  return identity;
}

export function usePartyKit(
  boardId: string,
  onCursorUpdate: (cursors: RemoteCursor[]) => void,
) {
  const { user, isLoaded } = useUser();

  const socketRef = useRef<PartySocket | null>(null);
  const joinedRef = useRef(false);
  const hasJoinedBeforeRef = useRef(false);
  const cursorsRef = useRef<Map<string, RemoteCursor>>(new Map());
  const lastCursorPositionRef = useRef<{ x: number; y: number } | null>(null);
  const cursorFrameRef = useRef<number | null>(null);

  const [activeUsers, setActiveUsers] = useState<RemoteCursor[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [wasKicked, setWasKicked] = useState(false);
  const [guestNameOverride, setGuestNameOverride] = useState<string | null>(null);

  const guestIdentity = useMemo(() => {
    if (typeof window === "undefined" || !isLoaded || user) return null;
    return getGuestIdentity();
  }, [isLoaded, user]);

  const isGuest = isLoaded && !user;
  const userId = !isLoaded ? null : (user?.id ?? guestIdentity?.id ?? null);
  const userName =
    user?.fullName ?? user?.username ?? guestIdentity?.name ?? "Anonymous";
  const avatarUrl = user?.imageUrl;
  const guestName = guestNameOverride ?? guestIdentity?.name ?? "";

  // Latest values for use inside socket listeners without reconnecting
  const identityRef = useRef<{ name: string; avatarUrl?: string; isGuest: boolean }>({
    name: "",
    isGuest: false,
  });
  const onCursorUpdateRef = useRef(onCursorUpdate);
  useLayoutEffect(() => {
    identityRef.current = {
      name: isGuest ? guestName || userName : userName,
      avatarUrl,
      isGuest,
    };
    onCursorUpdateRef.current = onCursorUpdate;
  });

  const setGuestName = useCallback(
    (name: string) => {
      if (!guestIdentity) return;
      try {
        localStorage.setItem(
          "guest_identity",
          JSON.stringify({ ...guestIdentity, name }),
        );
      } catch {
        /* ignore */
      }
      setGuestNameOverride(name);
      if (joinedRef.current) {
        socketRef.current?.send(JSON.stringify({ type: "user:rename", name }));
      }
    },
    [guestIdentity],
  );

  useEffect(() => {
    if (!boardId || !userId) return;

    let cancelled = false;
    let emitFrame: number | null = null;
    let refetchTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const dedupedByUser = () => {
      const byUser = new Map<string, RemoteCursor>();
      for (const c of cursorsRef.current.values()) byUser.set(c.userId, c);
      return Array.from(byUser.values());
    };

    const emitCursors = () => {
      onCursorUpdateRef.current(
        dedupedByUser().filter(
          (c) => c.userId !== userId && (c.x !== 0 || c.y !== 0),
        ),
      );
    };

    const scheduleEmit = () => {
      if (emitFrame != null) return;
      emitFrame = requestAnimationFrame(() => {
        emitFrame = null;
        emitCursors();
      });
    };

    const emitPresence = () => {
      setActiveUsers(dedupedByUser());
      emitCursors();
    };

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
      room: boardId,
    });
    socketRef.current = socket;

    const retryLater = () => {
      retryTimer = setTimeout(() => {
        if (!cancelled) socket.reconnect();
      }, 3000);
    };

    socket.addEventListener("open", async () => {
      joinedRef.current = false;
      try {
        // A fresh token on EVERY open: tokens live 5 minutes.
        const res = await fetch(`/api/boards/${boardId}/party-token`, {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;

        if (res.status === 403 || res.status === 404) {
          setWasKicked(true); // access revoked, or the board is gone
          socket.close();
          return;
        }
        if (!res.ok) {
          retryLater();
          return;
        }

        const { token } = await res.json();
        if (cancelled) return;

        const id = identityRef.current;
        socket.send(
          JSON.stringify({
            type: "user:join",
            userId,
            name: id.name,
            avatarUrl: id.avatarUrl,
            color: userColor(userId),
            isGuest: id.isGuest,
            token,
          }),
        );
      } catch {
        if (!cancelled) retryLater();
      }
    });

    socket.addEventListener("close", () => {
      joinedRef.current = false;
      cursorsRef.current.clear();
      if (cancelled) return;
      setStatus("offline");
      setActiveUsers([]);
      onCursorUpdateRef.current([]);
    });

    socket.addEventListener("message", (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "join:ok": {
          setRole(msg.role);
          const goOnline = () => {
            joinedRef.current = true;
            setStatus("online");
          };

          if (!hasJoinedBeforeRef.current) {
            hasJoinedBeforeRef.current = true;
            goOnline();
            break;
          }

          // Re-connect: we may have missed edits. Stay read-only, wait for the
          // server's 1 s save window, then reload the board from the database.
          setStatus("connecting");
          clearTimeout(refetchTimer);
          refetchTimer = setTimeout(async () => {
            try {
              const shapes = await apiFetchShapes(boardId);
              if (!cancelled) {
                useStore.setState((s) => ({
                  shapes,
                  selectedIds: s.selectedIds.filter((sid) =>
                    shapes.some((x: { id: string }) => x.id === sid),
                  ),
                }));
              }
            } catch {
              /* keep what we have */
            }
            if (!cancelled) goOnline();
          }, 1500);
          break;
        }

        case "cursors:init":
          for (const [connId, cursor] of Object.entries(
            msg.cursors as Record<string, CursorInitPayload>,
          )) {
            cursorsRef.current.set(connId, { connectionId: connId, ...cursor });
          }
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

        case "cursor:move": {
          const existing = cursorsRef.current.get(msg.connectionId);
          if (existing) {
            existing.x = msg.x;
            existing.y = msg.y;
            scheduleEmit();
          }
          break;
        }

        case "user:rename": {
          const toRename = cursorsRef.current.get(msg.connectionId);
          if (toRename) {
            toRename.name = msg.name;
            emitPresence();
          }
          break;
        }

        case "shape:add":
          useStore.getState().addShapeFromRemote(msg.shape);
          break;

        case "shape:update":
          useStore.getState().updateShapeFromRemote(msg.shapeId, msg.props);
          break;

        case "shape:delete":
          useStore.getState().deleteShapesFromRemote(msg.ids);
          break;

        case "shapes:sync":
          // Snapshot restore: old undo history refers to shapes that may no
          // longer exist, so reset it together with the selection.
          useStore.setState({
            shapes: msg.shapes,
            selectedIds: [],
            history: { past: [], future: [] },
            canUndo: false,
            canRedo: false,
          });
          break;

        case "role:update":
          setRole(msg.role);
          break;

        case "kicked":
          setWasKicked(true);
          break;
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(refetchTimer);
      clearTimeout(retryTimer);
      if (emitFrame != null) cancelAnimationFrame(emitFrame);
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
      joinedRef.current = false;
      hasJoinedBeforeRef.current = false;
      cursorsRef.current.clear();
    };
  }, [boardId, userId]);

  // ---- outgoing ---------------------------------------------------------------

  const flushCursor = useCallback(() => {
    cursorFrameRef.current = null;
    const pos = lastCursorPositionRef.current;
    if (!joinedRef.current || !pos) return;
    socketRef.current?.send(
      JSON.stringify({ type: "cursor:move", x: pos.x, y: pos.y }),
    );
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

  useEffect(() => {
    return () => {
      if (cursorFrameRef.current != null) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
    };
  }, []);

  // Messages are only sent once the server has accepted our join, so nothing
  // gets queued by the socket and replayed before user:join.
  const send = useCallback((payload: object) => {
    if (!joinedRef.current) return;
    socketRef.current?.send(JSON.stringify(payload));
  }, []);

  const sendShapeAdd = useCallback(
    (shape: object) => send({ type: "shape:add", shape }),
    [send],
  );
  const sendShapeUpdate = useCallback(
    (shapeId: string, props: object) =>
      send({ type: "shape:update", shapeId, props }),
    [send],
  );
  const sendShapeDelete = useCallback(
    (ids: string[]) => send({ type: "shape:delete", ids }),
    [send],
  );

  return {
    activeUsers,
    isGuest,
    guestName,
    setGuestName,
    sendCursor,
    sendShapeAdd,
    sendShapeUpdate,
    sendShapeDelete,
    role,
    status,
    canEdit: status === "online" && (role === "owner" || role === "editor"),
    wasKicked,
  };
}