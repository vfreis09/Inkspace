import type * as Party from "partykit/server";

type CursorState = {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

type ClientMessage =
  | { type: "shape:add"; shape: any }
  | { type: "shape:update"; shapeId: string; props: object }
  | { type: "shape:delete"; ids: string[] }
  | { type: "cursor:move"; x: number; y: number }
  | { type: "user:join"; userId: string; name: string; color: string }
  | { type: "shapes:sync"; shapes: any[] };

export default class InkspaceParty implements Party.Server {
  private cursors = new Map<string, CursorState>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUpserts = new Map<string, any>();
  private pendingDeletes = new Set<string>();

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    const cursors = Object.fromEntries(this.cursors);
    conn.send(JSON.stringify({ type: "cursors:init", cursors }));
  }

  onClose(conn: Party.Connection) {
    this.cursors.delete(conn.id);
    this.room.broadcast(
      JSON.stringify({ type: "cursor:leave", connectionId: conn.id }),
    );
  }

  async onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMessage;

    switch (msg.type) {
      case "user:join":
        this.cursors.set(sender.id, { ...msg, x: 0, y: 0 });
        this.room.broadcast(
          JSON.stringify({
            connectionId: sender.id,
            ...msg,
          }),
          [sender.id],
        );
        break;

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
            [sender.id],
          );
        }
        break;

      case "shape:add":
        this.room.broadcast(
          JSON.stringify({ type: "shape:add", shape: msg.shape }),
          [sender.id],
        );
        this.pendingUpserts.set(msg.shape.id, msg.shape);
        this.scheduleSave();
        break;

      case "shape:update":
        this.room.broadcast(
          JSON.stringify({
            type: "shape:update",
            shapeId: msg.shapeId,
            props: msg.props,
          }),
          [sender.id],
        );
        const existing = this.pendingUpserts.get(msg.shapeId) || {
          id: msg.shapeId,
        };
        this.pendingUpserts.set(msg.shapeId, { ...existing, ...msg.props });
        this.scheduleSave();
        break;

      case "shape:delete":
        this.room.broadcast(
          JSON.stringify({ type: "shape:delete", ids: msg.ids }),
          [sender.id],
        );
        msg.ids.forEach((id) => {
          this.pendingUpserts.delete(id);
          this.pendingDeletes.add(id);
        });
        this.scheduleSave();
        break;

      case "shapes:sync":
        this.room.broadcast(
          JSON.stringify({ type: "shapes:sync", shapes: msg.shapes }),
          [sender.id],
        );

        this.pendingUpserts.clear();
        this.pendingDeletes.clear();

        msg.shapes.forEach((s) => {
          this.pendingUpserts.set(s.id, s);
        });

        this.scheduleSave();
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

    try {
      const response = await fetch(
        `${baseUrl}/api/boards/${this.room.id}/shapes/batch`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-partykit-secret":
              process.env.PARTYKIT_SECRET || "development_secret",
          },
          body: JSON.stringify({ shapes: upserts, deletedIds: deletes }),
        },
      );

      if (!response.ok) {
        throw new Error(`DB Save Failed: ${response.statusText}`);
      }
      console.log(
        `Successfully synced ${upserts.length} updates and ${deletes.length} deletes.`,
      );
    } catch (err) {
      console.error("Flush Error:", err);
      upserts.forEach((s) => this.pendingUpserts.set(s.id, s));
      deletes.forEach((id) => this.pendingDeletes.add(id));
    }
  }
}
