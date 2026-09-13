import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { WebSocketServer } from "ws";
import {
  TLSocketRoom,
  SQLiteSyncStorage,
  NodeSqliteWrapper,
} from "@tldraw/sync-core";
import { createTLSchema } from "@tldraw/tlschema";

const PORT = Number(process.env.LIVE_PORT || 8893);
const ORIGIN = process.env.LIVE_ORIGIN || "http://127.0.0.1:8892";
const AUTH_API = process.env.LIVE_AUTH_API || "http://127.0.0.1:8791";
const AUTH_DB =
  process.env.LIVE_AUTH_DB ||
  "/home/chaiwithjai/Documents/code/dharmic-imagine-together/local-workloads/team-studio/data/team.sqlite3";
const DIR = resolve(process.env.LIVE_DATA_DIR || "data");
mkdirSync(DIR, { recursive: true, mode: 0o700 });
chmodSync(DIR, 0o700);
const auth = new DatabaseSync(AUTH_DB, { readOnly: true });
const db = new DatabaseSync(resolve(DIR, "live.sqlite3"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, workspace TEXT NOT NULL, actor TEXT NOT NULL, body TEXT NOT NULL, state TEXT NOT NULL, shape_id TEXT, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, workspace TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL);
`);
const rooms = new Map(),
  connections = new Map(),
  decisionsInFlight = new Set();
const loginAttempts = new Map();
const schema = createTLSchema();
function buzzState(wid) {
  try {
    const s = JSON.parse(
      readFileSync(resolve(DIR, "buzz-bridge/status.json"), "utf8"),
    );
    if (wid && s.workspace !== wid) return "not_bound";
    return s.connected && Date.now() - s.updated < 10000
      ? "connected"
      : "not_connected";
  } catch {
    return "not_connected";
  }
}
function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
function sha(s) {
  return createHash("sha256").update(s).digest("hex");
}
function identity(req, wid) {
  const token =
    /(?:^|;\s*)imagine_session=([^;]+)/.exec(req.headers.cookie || "")?.[1] ||
    "";
  const user = auth
    .prepare(
      "SELECT users.id, users.name FROM users JOIN sessions ON sessions.user_id=users.id WHERE sessions.token_hash=? AND sessions.expires_at>?",
    )
    .get(sha(token), Date.now() / 1000);
  if (!user) fail(401, "Sign in to Imagine Together first.");
  if (wid) {
    const member = auth
      .prepare("SELECT role FROM members WHERE workspace_id=? AND user_id=?")
      .get(wid, user.id);
    if (!member) fail(403, "Workspace access denied.");
    user.role = member.role;
  }
  return user;
}
function edit(user) {
  if (!["owner", "editor"].includes(user.role))
    fail(403, "This account has read-only access.");
}
function event(wid, kind, body) {
  const id = randomUUID();
  db.prepare("INSERT INTO events VALUES(?,?,?,?,?)").run(
    id,
    wid,
    kind,
    JSON.stringify(body),
    new Date().toISOString(),
  );
  return id;
}
function room(wid) {
  if (rooms.has(wid)) return rooms.get(wid);
  if (!/^[a-f0-9]{32}$/.test(wid)) fail(400, "Invalid workspace.");
  const storage = new SQLiteSyncStorage({
    sql: new NodeSqliteWrapper(db, { tablePrefix: "r_" + wid + "_" }),
  });
  // Changes and metadata-only event records share the same SQLite transaction.
  for (const [op, ref] of [
    ["INSERT", "NEW"],
    ["UPDATE", "NEW"],
    ["DELETE", "OLD"],
  ]) {
    db.exec(`CREATE TRIGGER IF NOT EXISTS r_${wid}_${op} AFTER ${op} ON r_${wid}_documents BEGIN
   INSERT INTO events VALUES(lower(hex(randomblob(16))), '${wid}', 'board_record_${op.toLowerCase()}', json_object('record_id',${ref}.id), strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;`);
  }

  const r = new TLSocketRoom({
    schema,
    storage,
    // In pinned 5.4.2 this hook runs after chunk assembly and BEFORE processing.
    // Identity is stamped server-side for both full presence and presence patches.
    onAfterReceiveMessage({ message, meta }) {
      if (message.type === "push" && message.presence) {
        const [op, p] = message.presence;
        if (op === "put") {
          p.userId = "user:" + meta.id;
          p.userName = meta.name;
          p.chatMessage = "";
        }
        if (op === "patch") {
          p.userId = ["put", "user:" + meta.id];
          p.userName = ["put", meta.name];
          p.chatMessage = ["put", ""];
        }
      }
    },
    authorizeRecord: {
      shape({ next, prev }) {
        const record = next || prev;
        if (record.id.startsWith("shape:proposal_")) {
          if (!prev)
            throw Error("Proposal shapes are created by the approval service.");
          if (next) return { ...next, meta: prev.meta };
        }
        return next;
      },
      user({ next, session }) {
        if (!next || next.id !== "user:" + session.meta.id)
          throw Error("Identity is server-owned");
        return { ...next, name: session.meta.name };
      },
      asset() {
        throw Error("Asset uploads are not enabled in this local proof.");
      },
    },
  });
  // Recover the narrow crash window between durable shape insertion and proposal bookkeeping.
  // The reserved shape namespace is not client-creatable, so this cannot forge an approval.
  for (const p of db
    .prepare("SELECT id FROM proposals WHERE workspace=? AND state='pending'")
    .all(wid)) {
    const shapeId = "shape:proposal_" + p.id,
      shape = r.getRecord(shapeId);
    if (shape?.meta?.acceptedBy) {
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "UPDATE proposals SET state='accepted',shape_id=? WHERE id=?",
        ).run(shapeId, p.id);
        event(wid, "proposal_accept_recovered", {
          proposal_id: p.id,
          actor: shape.meta.acceptedBy,
          shape_id: shapeId,
        });
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    }
  }
  rooms.set(wid, r);
  return r;
}
async function body(req) {
  let size = 0,
    chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 64 * 1024) fail(413, "Request too large.");
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    fail(400, "Invalid JSON.");
  }
}
function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}
function validateNote(input) {
  if (
    !input ||
    typeof input.text !== "string" ||
    !input.text.trim() ||
    input.text.length > 3000
  )
    fail(422, "Provide a note of 1–3000 characters.");
  for (const k of ["x", "y"])
    if (!Number.isFinite(input[k]) || Math.abs(input[k]) > 100000)
      fail(422, "Invalid note coordinates.");
  return { text: input.text.trim(), x: input.x, y: input.y };
}
function agent(req, wid) {
  const expected = process.env.LIVE_AGENT_TOKEN || "",
    given = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (
    expected.length < 40 ||
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  )
    fail(403, "Agent bridge is not authorized.");
  // One operator-configured workspace and principal. Browser/agent payload cannot choose identity.
  if (wid !== process.env.LIVE_AGENT_WORKSPACE)
    fail(403, "Workspace not bound to this agent.");
  const actor = process.env.LIVE_AGENT_ACTOR;
  const m = auth
    .prepare("SELECT role FROM members WHERE workspace_id=? AND user_id=?")
    .get(wid, actor);
  if (!m) fail(403, "Agent sponsor is no longer a member.");
  edit(m);
  return actor;
}
const server = createServer(async (req, res) => {
  try {
    if (
      ![
        "127.0.0.1:" + PORT,
        "localhost:" + PORT,
        "127.0.0.1:8892",
        "localhost:8892",
      ].includes(req.headers.host)
    )
      fail(403, "Local host required.");
    const url = new URL(req.url, "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/live/health")
      return json(res, 200, {
        status: "ok",
        storage: "SQLite",
        buzz: buzzState(),
        board: "separate_live_board",
      });
    const isAgent = url.pathname.startsWith("/agent/");
    if (
      !isAgent &&
      !["GET", "HEAD"].includes(req.method) &&
      req.headers.origin !== ORIGIN
    )
      fail(403, "Request origin denied.");
    if (url.pathname === "/live/login" && req.method === "POST") {
      const recent = (loginAttempts.get("local") || []).filter(
        (t) => t > Date.now() - 900000,
      );
      if (recent.length >= 20)
        fail(429, "Too many login attempts. Try again later.");
      loginAttempts.set("local", [...recent, Date.now()]);
      const data = await body(req);
      const upstream = await fetch(AUTH_API + "/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:8790",
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(10000),
      });
      for (const cookie of upstream.headers.getSetCookie())
        res.setHeader("Set-Cookie", cookie);
      return json(res, upstream.status, await upstream.json());
    }
    if (url.pathname === "/live/session") {
      const user = identity(req);
      return json(res, 200, {
        user,
        workspaces: auth
          .prepare(
            "SELECT workspaces.id,workspaces.name,members.role FROM workspaces JOIN members ON members.workspace_id=workspaces.id WHERE members.user_id=?",
          )
          .all(user.id),
      });
    }
    const match =
      /^\/(live|agent)\/rooms\/([a-f0-9]{32})\/(snapshot|proposals|events|people)(?:\/([a-f0-9-]+)\/(accept|reject))?$/.exec(
        url.pathname,
      );
    if (!match) fail(404, "Not found.");
    const [, lane, wid, action, pid, decision] = match;
    const actor =
      lane === "agent"
        ? { id: agent(req, wid), role: "editor" }
        : identity(req, wid);
    if (
      lane === "agent" &&
      !(action === "proposals" && req.method === "POST" && !pid)
    )
      fail(403, "Agents can only propose a new note.");
    if (action === "snapshot" && req.method === "GET")
      return json(res, 200, room(wid).getCurrentSnapshot());
    if (action === "people" && req.method === "GET") {
      const people = new Map();
      for (const c of connections.values())
        if (c.wid === wid)
          people.set(c.user.id, {
            id: c.user.id,
            name: c.user.name,
            role: c.user.role,
          });
      return json(res, 200, { people: [...people.values()] });
    }
    if (action === "events" && req.method === "GET")
      return json(res, 200, {
        events: db
          .prepare(
            "SELECT * FROM events WHERE workspace=? ORDER BY created DESC LIMIT 100",
          )
          .all(wid),
        buzz: buzzState(wid),
      });
    if (action === "proposals" && req.method === "GET")
      return json(res, 200, {
        buzz: buzzState(wid),
        proposals: db
          .prepare(
            "SELECT * FROM proposals WHERE workspace=? ORDER BY created DESC LIMIT 50",
          )
          .all(wid)
          .map((p) => ({ ...p, body: JSON.parse(p.body) })),
      });
    if (action === "proposals" && req.method === "POST" && !pid) {
      edit(actor);
      const data = await body(req),
        note = {
          ...validateNote(data),
          author_kind: lane === "agent" ? "agent" : "collaborator",
          trace_id:
            lane === "agent" && /^tr-[a-f0-9]{32}$/.test(data.trace_id || "")
              ? data.trace_id
              : null,
        };
      const id = data.event_id;
      if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(id))
        fail(422, "Provide a stable event_id.");
      const key = sha(wid + ":" + actor.id + ":" + id),
        old = db.prepare("SELECT * FROM proposals WHERE id=?").get(key);
      if (old) {
        if (old.body !== JSON.stringify(note))
          fail(409, "Event ID already used for a different proposal.");
        return json(res, 200, { id: key, state: old.state, replayed: true });
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("INSERT INTO proposals VALUES(?,?,?,?,?,?,?)").run(
          key,
          wid,
          actor.id,
          JSON.stringify(note),
          "pending",
          null,
          new Date().toISOString(),
        );
        event(wid, "note_proposed", {
          proposal_id: key,
          actor: actor.id,
          origin: lane,
        });
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return json(res, 201, {
        id: key,
        state: "pending",
        applied: false,
        buzz: buzzState(wid),
      });
    }
    if (action === "proposals" && req.method === "POST" && pid) {
      edit(actor);
      const p = db
        .prepare("SELECT * FROM proposals WHERE id=? AND workspace=?")
        .get(pid, wid);
      if (!p) fail(404, "Proposal not found.");
      if (p.state !== "pending")
        return json(res, 200, { id: pid, state: p.state, replayed: true });
      if (decisionsInFlight.has(pid))
        fail(409, "This proposal is being decided. Refresh its status.");
      decisionsInFlight.add(pid);
      try {
        const r = room(wid),
          note = JSON.parse(p.body),
          shapeId = "shape:proposal_" + pid;
        // Deterministic ID makes a retry after process interruption safe. Never overwrite an existing shape.
        if (decision === "accept")
          await r.updateStore((store) => {
            if (store.get(shapeId)) return;
            const page = store.getAll().find((x) => x.typeName === "page");
            if (!page) fail(409, "Open the board before accepting a proposal.");
            store.put({
              id: shapeId,
              typeName: "shape",
              type: "note",
              x: note.x,
              y: note.y,
              rotation: 0,
              index: "a1",
              parentId: page.id,
              isLocked: false,
              opacity: 1,
              props: {
                textLastEditedBy: null,
                color: "light-violet",
                labelColor: "black",
                size: "s",
                font: "sans",
                fontSizeAdjustment: 1,
                align: "middle",
                verticalAlign: "middle",
                growY: Math.max(
                  0,
                  note.text
                    .split("\n")
                    .reduce(
                      (lines, line) =>
                        lines + Math.max(1, Math.ceil(line.length / 16)),
                      0,
                    ) *
                    28 +
                    48 -
                    200,
                ),
                url: "",
                scale: 1,
                richText: {
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: note.text }],
                    },
                  ],
                },
              },
              meta: {
                proposalId: pid,
                acceptedBy: actor.id,
                proposedBy: p.actor,
              },
            });
          });
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE proposals SET state=?,shape_id=? WHERE id=?").run(
            decision === "accept" ? "accepted" : "rejected",
            decision === "accept" ? shapeId : null,
            pid,
          );
          event(wid, "proposal_" + decision, {
            proposal_id: pid,
            actor: actor.id,
            shape_id: decision === "accept" ? shapeId : null,
          });
          db.exec("COMMIT");
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
        return json(res, 200, {
          id: pid,
          state: decision === "accept" ? "accepted" : "rejected",
          shape_id: shapeId,
        });
      } finally {
        decisionsInFlight.delete(pid);
      }
    }
    fail(405, "Method not allowed.");
  } catch (e) {
    json(res, e.status || 500, {
      detail: e.status ? e.message : "Local board service error.",
    });
    if (!e.status) console.error(e);
  }
});
const wsServer = new WebSocketServer({
  noServer: true,
  maxPayload: 1024 * 1024,
});
server.on("upgrade", (req, socket, head) => {
  try {
    if (req.headers.origin !== ORIGIN) fail(403, "Origin denied");
    const url = new URL(req.url, "http://127.0.0.1"),
      match = /^\/live\/connect\/([a-f0-9]{32})$/.exec(url.pathname);
    if (!match) fail(404, "Unknown room");
    const wid = match[1],
      user = identity(req, wid),
      r = room(wid);
    if (connections.size >= 30) fail(429, "Local session limit");
    wsServer.handleUpgrade(req, socket, head, (ws) => {
      const id = randomUUID();
      connections.set(id, { wid, user, ws, req });
      // Omit event listener methods so all incoming messages pass our membership check first.
      r.handleSocketConnect({
        sessionId: id,
        socket: {
          send: (s) => ws.send(s),
          close: (c, s) => ws.close(c, s),
          get readyState() {
            return ws.readyState;
          },
        },
        isReadonly: !["owner", "editor"].includes(user.role),
        meta: user,
      });
      let count = 0,
        start = Date.now();
      ws.on("message", (data) => {
        try {
          const current = identity(req, wid);
          if (current.role !== user.role) throw Error("Role changed");
          if (Date.now() - start > 1000) {
            start = Date.now();
            count = 0;
          }
          if (++count > 150) throw Error("Rate limit");
          r.handleSocketMessage(id, data.toString());
        } catch {
          ws.close(1008, "Access changed or rate exceeded");
        }
      });
      ws.on("close", () => {
        connections.delete(id);
        r.handleSocketClose(id);
      });
      ws.on("error", () => {
        r.handleSocketError(id);
      });
    });
  } catch (e) {
    socket.end(
      "HTTP/1.1 " + (e.status || 403) + " Denied\r\nConnection: close\r\n\r\n",
    );
  }
});
const recheck = setInterval(() => {
  for (const c of connections.values())
    try {
      const u = identity(c.req, c.wid);
      if (u.role !== c.user.role) throw Error();
    } catch {
      c.ws.close(1008, "Access changed");
    }
}, 2000);
server.listen(PORT, "127.0.0.1", () =>
  console.log("Local live board backend on 127.0.0.1:" + PORT),
);
process.on("SIGTERM", () => {
  clearInterval(recheck);
  for (const c of connections.values()) c.ws.close(1001, "Server restarting");
  for (const r of rooms.values()) r.close();
  server.close(() => {
    db.close();
    auth.close();
    process.exit(0);
  });
});
