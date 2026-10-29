import type * as Party from "partykit/server";
import { verifyPartyToken } from "@/lib/partyToken";
import type { Shape } from "@/features/boards/store/useStore";

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
  | { type: "shape:add"; shape: Shape }
  | { type: "shape:update"; shapeId: string; props: Partial<Shape> }
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
  | { type: "shapes:sync"; shapes: Shape[] };

type PendingShape = Partial<Shape> & Pick<Shape, "id">;

export default class InkspaceParty implements Party.Server {
  private cursors = new Map<string, CursorState>();
  private roles = new Map<string, "owner" | "editor" | "viewer" | null>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUpserts = new Map<string, PendingShape>();
  private pendingDeletes = new Set<string>();
  private flushCount = 0;
  private readonly SNAPSHOT_EVERY_N_FLUSHES = 10;
  private flushing = false;
  private retryDelay = 1000;
  private failedAttempts = 0;
  private deadLetter: { upserts: PendingShape[]; deletes: string[] }[] = [];
  private readonly MAX_RETRY_DELAY = 30000;
  private readonly MAX_FAILED_ATTEMPTS = 5;

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

    const body = (await req.json()) as
      | { type?: undefined; shapes: Shape[] }
      | { type: "shapes:sync"; shapes: Shape[] }
      | {
          type: "role:update";
          userId: string;
          role: "owner" | "editor" | "viewer" | null;
        };

    // Backward-compat: your existing snapshot-restore push sends { shapes } with no `type`
    if (!("type" in body) || body.type === "shapes:sync") {
      this.room.broadcast(
        JSON.stringify({ type: "shapes:sync", shapes: body.shapes }),
      );
      return new Response("ok", { status: 200 });
    }

    if (body.type === "role:update") {
      for (const [connId, cursor] of this.cursors) {
        if (cursor.userId === body.userId) {
          this.roles.set(connId, body.role);

          const conn = [...this.room.getConnections()].find((c) => c.id === connId);
          if (body.role === null) {
            // Explicit removal: tell them, then close the socket
            conn?.send(JSON.stringify({ type: "kicked" }));
            conn?.close();
          } else {
            conn?.send(JSON.stringify({ type: "role:update", role: body.role }));
          }
        }
      }
      return new Response("ok", { status: 200 });
      }
      
      return new Response("Bad request", { status: 400 });
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

  private scheduleSave(delay = 1000) {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flushToDB();
    }, delay);
  }


  private async flushToDB() {
    if (this.pendingUpserts.size === 0 && this.pendingDeletes.size === 0) return;

    if (this.flushing) {
      this.scheduleSave();
      return;
    }
    this.flushing = true;

    const upserts = Array.from(this.pendingUpserts.values());
    const deletes = Array.from(this.pendingDeletes);

    this.pendingUpserts.clear();
    this.pendingDeletes.clear();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shouldSnapshot = (this.flushCount + 1) % this.SNAPSHOT_EVERY_N_FLUSHES === 0;

    let rejectedByServer = false;

    try {
      const response = await fetch(
        `${baseUrl}/api/boards/${this.room.id}/shapes/batch`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-partykit-secret": SECRET,
          },
          body: JSON.stringify({ shapes: upserts, deletedIds: deletes, snapshot: shouldSnapshot }),
        },
      );

      if (!response.ok) {
        rejectedByServer = true;
        throw new Error(`DB Save Failed: ${response.status} ${response.statusText}`);
      }

      this.flushCount++;
      this.failedAttempts = 0;
      this.retryDelay = 1000;
    } catch (err) {
      if (rejectedByServer) {
        this.failedAttempts++;
        console.error(
          `Flush rejected by server (attempt ${this.failedAttempts}/${this.MAX_FAILED_ATTEMPTS}):`,
          err,
        );
      } else {
        console.error("Flush failed, server unreachable. Will keep retrying:", err);
      }

      if (rejectedByServer && this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        // The server keeps answering with an error: set this batch aside
        this.deadLetter.push({ upserts, deletes });
        console.error(
          `Giving up on a batch of ${upserts.length} upserts and ${deletes.length} deletes. ` +
            `Shape ids: ${[...upserts.map((s) => s.id), ...deletes].slice(0, 20).join(", ")}`,
        );
        this.failedAttempts = 0;
        this.retryDelay = 1000;
      } else {
        // Put the failed data back without overwriting anything newer
        for (const s of upserts) {
          if (this.pendingDeletes.has(s.id)) continue;
          const newer = this.pendingUpserts.get(s.id);
          this.pendingUpserts.set(s.id, { ...s, ...(newer ?? {}) });
        }
        for (const id of deletes) {
          if (this.pendingUpserts.has(id)) continue;
          this.pendingDeletes.add(id);
        }
        this.retryDelay = Math.min(this.retryDelay * 2, this.MAX_RETRY_DELAY);
      }
    } finally {
      this.flushing = false;
    }

    if (this.pendingUpserts.size > 0 || this.pendingDeletes.size > 0) {
      this.scheduleSave(this.retryDelay > 1000 ? this.retryDelay : 1000);
    }
  }
}
