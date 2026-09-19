import type * as Party from "partykit/server";
import { verifyPartyToken } from "@/lib/partyToken";

const SECRET = process.env.PARTYKIT_SECRET || "development_secret";

type CursorState = {
  userId: string;
  name: string;
  avatarUrl?: string;
  color: string;
  x: number;
  y: number;
  isGuest?: boolean;
};

type ClientMessage =
  | { type: "user:rename"; name: string }
  | { type: "shape:add"; shape: any }
  | { type: "shape:update"; shapeId: string; props: object }
  | { type: "shape:delete"; ids: string[] }
  | { type: "cursor:move"; x: number; y: number }
  | {
      type: "user:join";
      userId: string;
      name: string;
      avatarUrl?: string;
      color: string;
      isGuest?: boolean;
      token?: string;
    }
  | { type: "shapes:sync"; shapes: any[] };

export default class InkspaceParty implements Party.Server {
  private cursors = new Map<string, CursorState>();
  private roles = new Map<string, "owner" | "editor" | "viewer" | null>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUpserts = new Map<string, any>();
  private pendingDeletes = new Set<string>();
  private flushCount = 0;
  private readonly SNAPSHOT_EVERY_N_FLUSHES = 10;

  constructor(readonly room: Party.Room) {}

  private canEdit(connId: string) {
    const role = this.roles.get(connId);
    return role === "owner" || role === "editor";
  }


  onConnect(conn: Party.Connection) {
    const cursors = Object.fromEntries(this.cursors);
    conn.send(JSON.stringify({ type: "cursors:init", cursors }));
  }

  onClose(conn: Party.Connection) {
    this.cursors.delete(conn.id);
    this.roles.delete(conn.id);
    this.room.broadcast(JSON.stringify({ type: "cursor:leave", connectionId: conn.id }));
  }

  async onRequest(req: Party.Request) {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const authHeader = req.headers.get("x-partykit-secret");
    if (authHeader !== SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json() as { shapes: any[] };

    this.room.broadcast(JSON.stringify({ type: "shapes:sync", shapes: body.shapes }));

    return new Response("ok", { status: 200 });
  }

  async onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMessage;

    switch (msg.type) {
      case "user:join": {
        const payload = await verifyPartyToken(msg.token ?? null, SECRET);
        const role = payload && payload.boardId === this.room.id ? payload.role : null;
        this.roles.set(sender.id, role);

        // Reconnect handling: if this userId already has a (stale) connection, drop it first
        for (const [connId, c] of this.cursors) {
          if (c.userId === msg.userId && connId !== sender.id) {
            this.cursors.delete(connId);
            this.roles.delete(connId);
            this.room.broadcast(JSON.stringify({ type: "cursor:leave", connectionId: connId }));
          }
        }

        this.cursors.set(sender.id, { userId: msg.userId, name: msg.name, avatarUrl: msg.avatarUrl, color: msg.color, x: 0, y: 0, isGuest: msg.isGuest });
        this.room.broadcast(
          JSON.stringify({ type: "user:join", connectionId: sender.id, userId: msg.userId, name: msg.name, avatarUrl: msg.avatarUrl, color: msg.color, isGuest: msg.isGuest }),
        );
        break;
      }

      case "cursor:move":
        const cursor = this.cursors.get(sender.id);
        if (cursor) {
          cursor.x = msg.x;
          cursor.y = msg.y;
          this.room.broadcast(
            JSON.stringify({
              type: "cursor:move",
              connectionId: sender.id,
              ...cursor,
            }),
          );
        }
        break;

      case "shape:add":
        if (!this.canEdit(sender.id)) return; // silently dropped for viewers/unauthorized
        this.room.broadcast(JSON.stringify({ type: "shape:add", shape: msg.shape }), [sender.id]);
        this.pendingUpserts.set(msg.shape.id, msg.shape);
        this.scheduleSave();
        break;

      case "shape:update":
        if (!this.canEdit(sender.id)) return;
        this.room.broadcast(JSON.stringify({ type: "shape:update", shapeId: msg.shapeId, props: msg.props }), [sender.id]);
        this.pendingUpserts.set(msg.shapeId, { ...(this.pendingUpserts.get(msg.shapeId) || { id: msg.shapeId }), ...msg.props });
        this.scheduleSave();
        break;

      case "shape:delete":
        if (!this.canEdit(sender.id)) return;
        this.room.broadcast(JSON.stringify({ type: "shape:delete", ids: msg.ids }), [sender.id]);
        msg.ids.forEach((id) => { this.pendingUpserts.delete(id); this.pendingDeletes.add(id); });
        this.scheduleSave();
        break;

      case "shapes:sync":
        if (!this.canEdit(sender.id)) return;
        this.room.broadcast(JSON.stringify({ type: "shapes:sync", shapes: msg.shapes }), [sender.id]);
        this.pendingUpserts.clear();
        this.pendingDeletes.clear();
        msg.shapes.forEach((s) => this.pendingUpserts.set(s.id, s));
        this.scheduleSave();
        break;

      case "user:rename":
        const cursorToRename = this.cursors.get(sender.id);
        if (cursorToRename) {
          cursorToRename.name = msg.name;
          this.room.broadcast(
            JSON.stringify({
              type: "user:rename",
              connectionId: sender.id,
              name: msg.name,
            }),
          );
        }
        break;
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushToDB(), 1000);
  }

  private async flushToDB() {
    if (this.pendingUpserts.size === 0 && this.pendingDeletes.size === 0)
      return;

    const upserts = Array.from(this.pendingUpserts.values());
    const deletes = Array.from(this.pendingDeletes);

    this.pendingUpserts.clear();
    this.pendingDeletes.clear();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    this.flushCount++;
    const shouldSnapshot = this.flushCount % this.SNAPSHOT_EVERY_N_FLUSHES === 0; 

    try {
      const response = await fetch(
        `${baseUrl}/api/boards/${this.room.id}/shapes/batch`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-partykit-secret":
              SECRET,
          },
          body: JSON.stringify({ shapes: upserts, deletedIds: deletes, snapshot: shouldSnapshot, }),
        },
      );

      if (!response.ok) {
        throw new Error(`DB Save Failed: ${response.statusText}`);
      }
    } catch (err) {
      console.error("Flush Error:", err);
      upserts.forEach((s) => this.pendingUpserts.set(s.id, s));
      deletes.forEach((id) => this.pendingDeletes.add(id));
    }
  }
}
