import type * as Party from "partykit/server";
import { verifyPartyToken } from "@/lib/partyToken";
import {
  isGuestId,
  isIdList,
  isNum,
  isStr,
  sanitizeShape,
  sanitizeShapeUpdate,
} from "@/lib/shapeValidation";
import type { Shape } from "@/features/boards/store/useStore";

const SECRET = process.env.PARTYKIT_SECRET ?? "";
if (!SECRET) throw new Error("PARTYKIT_SECRET is not set");

type Role = "owner" | "editor" | "viewer";

type Member = {
  userId: string;
  name: string;
  avatarUrl?: string;
  color: string;
  x: number;
  y: number;
  isGuest: boolean;
  role: Role;
};

type PendingShape = Partial<Shape> & Pick<Shape, "id">;
type Chunk = { upserts: PendingShape[]; deletes: string[] };

const JOIN_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_CHARS = 1_000_000;
const MAX_IDS_PER_MESSAGE = 10_000;
const CURSOR_MIN_INTERVAL_MS = 30;
const MAX_CHUNK_CHARS = 1_500_000;
const MAX_CHUNK_DELETES = 5_000;
const FETCH_TIMEOUT_MS = 25_000;

const isRole = (v: unknown): v is Role =>
  v === "owner" || v === "editor" || v === "viewer";

const cleanText = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

function toChunks(upserts: PendingShape[], deletes: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let current: Chunk = { upserts: [], deletes: [] };
  let size = 0;

  const closeCurrent = () => {
    if (current.upserts.length > 0 || current.deletes.length > 0) {
      chunks.push(current);
    }
    current = { upserts: [], deletes: [] };
    size = 0;
  };

  for (const id of deletes) {
    current.deletes.push(id);
    if (current.deletes.length >= MAX_CHUNK_DELETES) closeCurrent();
  }
  for (const shape of upserts) {
    const len = JSON.stringify(shape).length;
    if (current.upserts.length > 0 && size + len > MAX_CHUNK_CHARS) {
      closeCurrent();
    }
    current.upserts.push(shape);
    size += len;
  }
  closeCurrent();
  return chunks;
}

export default class InkspaceParty implements Party.Server {
  // Only connections that passed user:join verification are in this map.
  private members = new Map<string, Member>();
  private lastCursorAt = new Map<string, number>();

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private notBefore = 0;
  private pendingUpserts = new Map<string, PendingShape>();
  private pendingDeletes = new Set<string>();
  private flushing = false;
  private retryDelay = 1000;
  private failedAttempts = 0;
  private deadLetter: Chunk[] = [];
  private readonly MAX_RETRY_DELAY = 30_000;
  private readonly MAX_FAILED_ATTEMPTS = 5;

  constructor(readonly room: Party.Room) {}

  private canEdit(connId: string) {
    const role = this.members.get(connId)?.role;
    return role === "owner" || role === "editor";
  }

  private publicInfo(m: Member) {
    return {
      userId: m.userId,
      name: m.name,
      avatarUrl: m.avatarUrl,
      color: m.color,
      isGuest: m.isGuest,
    };
  }

  private cursorSnapshot() {
    const out: Record<string, unknown> = {};
    for (const [id, m] of this.members) {
      out[id] = { ...this.publicInfo(m), x: m.x, y: m.y };
    }
    return out;
  }

  /** Send to verified members only. */
  private toMembers(data: unknown, exceptConnId?: string) {
    const text = JSON.stringify(data);
    for (const conn of this.room.getConnections()) {
      if (conn.id === exceptConnId || !this.members.has(conn.id)) continue;
      conn.send(text);
    }
  }

  onConnect(conn: Party.Connection) {
    // Send nothing yet. A connection that never proves itself is dropped.
    setTimeout(() => {
      if (!this.members.has(conn.id)) conn.close();
    }, JOIN_TIMEOUT_MS);
  }

  onClose(conn: Party.Connection) {
    const wasMember = this.members.delete(conn.id);
    this.lastCursorAt.delete(conn.id);
    if (wasMember) {
      this.toMembers({ type: "cursor:leave", connectionId: conn.id });
    }

    // Last one out: save now, the room may be evicted before the timer fires.
    let others = 0;
    for (const c of this.room.getConnections()) {
      if (c.id !== conn.id) others++;
    }
    if (others === 0) void this.flushToDB();
  }

  // HTTP control channel used by your Next.js API (secret protected)
  async onRequest(req: Party.Request) {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (req.headers.get("x-partykit-secret") !== SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return new Response("Bad request", { status: 400 });
    }

    if (body.type === "role:update" && typeof body.userId === "string") {
      const role = body.role === null ? null : isRole(body.role) ? body.role : undefined;
      if (role === undefined) return new Response("Bad request", { status: 400 });

      for (const [connId, member] of this.members) {
        if (member.userId !== body.userId) continue;
        const conn = this.room.getConnection(connId);
        if (role === null) {
          conn?.send(JSON.stringify({ type: "kicked" }));
          conn?.close();
        } else {
          member.role = role;
          conn?.send(JSON.stringify({ type: "role:update", role }));
        }
      }
      return new Response("ok", { status: 200 });
    }

    // Board visibility or link role changed, or the board was deleted:
    // close everything. Clients reconnect and fetch a fresh token, so people
    // who lost access are rejected and everyone else rejoins automatically.
    if (body.type === "access:changed") {
      for (const conn of this.room.getConnections()) conn.close();
      return new Response("ok", { status: 200 });
    }

    // Snapshot restore (the old { shapes } body with no type is still accepted)
    if (
      (body.type === undefined || body.type === "shapes:sync") &&
      Array.isArray(body.shapes)
    ) {
      // The database was just replaced, so pending edits must not flush over it.
      this.pendingUpserts.clear();
      this.pendingDeletes.clear();
      this.toMembers({ type: "shapes:sync", shapes: body.shapes });
      return new Response("ok", { status: 200 });
    }

    return new Response("Bad request", { status: 400 });
  }

  async onMessage(
    raw: string | ArrayBuffer | ArrayBufferView,
    sender: Party.Connection,
  ) {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_CHARS) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let msg: Record<string, any>;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return;

    switch (msg.type) {
      case "user:join": {
        if (this.members.has(sender.id)) return;

        let payload: Awaited<ReturnType<typeof verifyPartyToken>> = null;
        try {
          payload = await verifyPartyToken(
            typeof msg.token === "string" ? msg.token : null,
            SECRET,
          );
        } catch {
          payload = null; // malformed token
        }
        // another join may have finished while we were verifying
        if (this.members.has(sender.id)) return;

        // Identity comes from the signed token. Only guests (no Clerk id)
        // may bring their own id, and only in the guest_ format.
        const userId = payload?.userId ?? (isGuestId(msg.userId) ? msg.userId : null);

        if (!payload || payload.boardId !== this.room.id || !payload.role || !userId) {
          sender.send(JSON.stringify({ type: "join:rejected" }));
          sender.close();
          return;
        }

        const member: Member = {
          userId,
          name: cleanText(msg.name, 40) || "Anonymous",
          avatarUrl:
            typeof msg.avatarUrl === "string" &&
            msg.avatarUrl.startsWith("https://") &&
            msg.avatarUrl.length <= 300
              ? msg.avatarUrl
              : undefined,
          color:
            typeof msg.color === "string" && /^#[0-9a-f]{6}$/i.test(msg.color)
              ? msg.color
              : "#6366f1",
          x: 0,
          y: 0,
          isGuest: payload.userId === null,
          role: payload.role,
        };

        sender.send(JSON.stringify({ type: "join:ok", role: member.role }));
        sender.send(
          JSON.stringify({ type: "cursors:init", cursors: this.cursorSnapshot() }),
        );
        this.members.set(sender.id, member);
        this.toMembers(
          { type: "user:join", connectionId: sender.id, ...this.publicInfo(member) },
          sender.id,
        );
        return;
      }

      case "cursor:move": {
        const member = this.members.get(sender.id);
        if (!member || !isNum(msg.x) || !isNum(msg.y)) return;

        const now = Date.now();
        if (now - (this.lastCursorAt.get(sender.id) ?? 0) < CURSOR_MIN_INTERVAL_MS) {
          return;
        }
        this.lastCursorAt.set(sender.id, now);

        member.x = msg.x;
        member.y = msg.y;
        this.toMembers(
          { type: "cursor:move", connectionId: sender.id, x: msg.x, y: msg.y },
          sender.id,
        );
        return;
      }

      case "shape:add": {
        if (!this.canEdit(sender.id)) return;
        const shape = sanitizeShape(msg.shape);
        if (!shape) return;

        this.toMembers({ type: "shape:add", shape }, sender.id);
        this.pendingUpserts.set(shape.id, shape);
        this.scheduleSave();
        return;
      }

      case "shape:update": {
        if (!this.canEdit(sender.id)) return;
        const props = sanitizeShapeUpdate(msg.props);
        if (!isStr(msg.shapeId, 64) || msg.shapeId.length === 0 || !props) return;

        this.toMembers(
          { type: "shape:update", shapeId: msg.shapeId, props },
          sender.id,
        );
        this.pendingUpserts.set(msg.shapeId, {
          ...(this.pendingUpserts.get(msg.shapeId) ?? { id: msg.shapeId }),
          ...props,
        });
        this.scheduleSave();
        return;
      }

      case "shape:delete": {
        if (!this.canEdit(sender.id)) return;
        if (!isIdList(msg.ids, MAX_IDS_PER_MESSAGE)) return;

        this.toMembers({ type: "shape:delete", ids: msg.ids }, sender.id);
        for (const id of msg.ids) {
          this.pendingUpserts.delete(id);
          this.pendingDeletes.add(id);
        }
        this.scheduleSave();
        return;
      }

      case "user:rename": {
        const member = this.members.get(sender.id);
        if (!member || !member.isGuest) return; // signed-in names come from Clerk
        const name = cleanText(msg.name, 24);
        if (!name) return;

        member.name = name;
        this.toMembers({ type: "user:rename", connectionId: sender.id, name });
        return;
      }

      default:
        return; // includes shapes:sync from clients, which is no longer accepted
    }
  }

  // ---- saving ---------------------------------------------------------------

  // Throttle, not debounce: the first edit starts a timer and later edits
  // don't push it back, so continuous editing can't postpone saving forever.
  private scheduleSave(delay = 1000) {
    if (this.saveTimer) return;
    const wait = Math.max(delay, this.notBefore - Date.now());
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flushToDB();
    }, wait);
  }

  private requeue(chunks: Chunk[]) {
    for (const chunk of chunks) {
      for (const s of chunk.upserts) {
        if (this.pendingDeletes.has(s.id)) continue;
        const newer = this.pendingUpserts.get(s.id);
        this.pendingUpserts.set(s.id, { ...s, ...(newer ?? {}) });
      }
      for (const id of chunk.deletes) {
        if (this.pendingUpserts.has(id)) continue;
        this.pendingDeletes.add(id);
      }
    }
  }

  private async sendChunk(
    baseUrl: string,
    chunk: Chunk,
  ): Promise<"ok" | "rejected" | "retry"> {
    try {
      const res = await fetch(
        `${baseUrl}/api/boards/${encodeURIComponent(this.room.id)}/shapes/batch`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-partykit-secret": SECRET,
          },
          body: JSON.stringify({ shapes: chunk.upserts, deletedIds: chunk.deletes }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
      if (res.ok) return "ok";
      console.error(`Batch save failed: ${res.status} ${res.statusText}`);
      // 401/403 means a configuration problem, so keep the data and retry
      // instead of throwing it away.
      return res.status === 401 || res.status === 403 ? "retry" : "rejected";
    } catch (err) {
      console.error("Batch save unreachable, will retry:", err);
      return "retry";
    }
  }

  private async flushToDB() {
    if (this.pendingUpserts.size === 0 && this.pendingDeletes.size === 0) return;

    if (this.flushing) {
      this.scheduleSave();
      return;
    }
    this.flushing = true;

    const chunks = toChunks(
      Array.from(this.pendingUpserts.values()),
      Array.from(this.pendingDeletes),
    );
    this.pendingUpserts.clear();
    this.pendingDeletes.clear();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
      for (let i = 0; i < chunks.length; i++) {
        const outcome = await this.sendChunk(baseUrl, chunks[i]);

        if (outcome === "ok") {
          this.failedAttempts = 0;
          this.retryDelay = 1000;
          this.notBefore = 0;
          continue;
        }

        if (outcome === "rejected" && ++this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          // Set only this chunk aside, the rest of the flush continues.
          this.deadLetter.push(chunks[i]);
          if (this.deadLetter.length > 20) this.deadLetter.shift();
          const ids = [...chunks[i].upserts.map((s) => s.id), ...chunks[i].deletes];
          console.error(
            `Giving up on a chunk of ${chunks[i].upserts.length} upserts and ` +
              `${chunks[i].deletes.length} deletes. Shape ids: ${ids.slice(0, 20).join(", ")}`,
          );
          this.failedAttempts = 0;
          this.retryDelay = 1000;
          this.notBefore = 0;
          continue;
        }

        // Network trouble, config trouble, or a rejection below the limit:
        // put this and every later chunk back and try again with backoff.
        this.requeue(chunks.slice(i));
        this.retryDelay = Math.min(this.retryDelay * 2, this.MAX_RETRY_DELAY);
        this.notBefore = Date.now() + this.retryDelay;
        break;
      }
    } finally {
      this.flushing = false;
    }

    if (this.pendingUpserts.size > 0 || this.pendingDeletes.size > 0) {
      this.scheduleSave();
    }
  }
}