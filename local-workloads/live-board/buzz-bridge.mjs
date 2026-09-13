// One owner, one channel, one sponsor-bound board; no shell tools or automatic approvals.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  commandFromEvent,
  connectRelay,
  sign,
  getPublicKey,
} from "./buzz-protocol.mjs";
const config = JSON.parse(
  readFileSync(
    process.env.BUZZ_BOARD_CONFIG || "buzz-local/bridge.json",
    "utf8",
  ),
);
for (const key of [
  "relay",
  "owner",
  "channel",
  "bot_secret",
  "python",
  "workspace",
  "board_url",
])
  if (typeof config[key] !== "string" || !config[key])
    throw Error("Missing bridge configuration: " + key);
if (
  !/^[a-f0-9]{64}$/.test(config.owner) ||
  !/^[a-f0-9]{64}$/.test(config.bot_secret)
)
  throw Error("Use 64-hex public/private keys in the protected configuration.");
const secret = Uint8Array.from(Buffer.from(config.bot_secret, "hex")),
  bot = getPublicKey(secret);
const dir = resolve(process.env.BUZZ_BOARD_DATA || "data/buzz-bridge");
mkdirSync(dir, { recursive: true, mode: 0o700 });
const db = new DatabaseSync(resolve(dir, "inbox.sqlite3"));
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE IF NOT EXISTS inbox(id TEXT PRIMARY KEY,instruction TEXT,created INTEGER,state TEXT,reply TEXT,attempts INTEGER DEFAULT 0);",
);
const binding = JSON.stringify([
  config.relay,
  config.owner,
  config.channel,
  config.workspace,
  bot,
]);
const old = db.prepare("SELECT value FROM config WHERE key='binding'").get();
if (old && old.value !== binding)
  throw Error(
    "Use a separate data directory for a different relay/channel/owner/board binding.",
  );
db.prepare("INSERT OR IGNORE INTO config VALUES('binding',?)").run(binding);
db.prepare("INSERT OR IGNORE INTO config VALUES('since',?)").run(
  String(Math.floor(Date.now() / 1000)),
);
const since = Number(
  db.prepare("SELECT value FROM config WHERE key='since'").get().value,
);
let connection,
  stopping = false,
  busy = false,
  activeChild = null;
async function generate(row) {
  const file = resolve(dir, row.id + ".txt");
  writeFileSync(file, row.instruction, { mode: 0o600 });
  return new Promise((resolve, reject) => {
    const child = spawn(
      config.python,
      ["bonsai-propose.py", "--instruction-file", file, "--event-id", row.id],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          LIVE_AGENT_WORKSPACE: config.workspace,
          BUZZ_EVENT_ID: row.id,
          BUZZ_ACTOR_PUBKEY: config.owner,
          BUZZ_CHANNEL_ID: config.channel,
          BUZZ_IDENTITY_KIND: config.identity_kind || "CONFIGURED_OWNER",
          ...(config.agent_env || {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    activeChild = child;
    let stdout = "",
      size = 0;
    child.stdout.on("data", (b) => {
      size += b.length;
      if (size < 64000) stdout += b.toString();
    });
    child.stderr.on("data", () => {});
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(Error("Local generation timed out"));
    }, 210000);
    child.on("error", () => {
      clearTimeout(timer);
      reject(Error("Could not start local proposal command"));
    });
    child.on("exit", (code) => {
      activeChild = null;
      clearTimeout(timer);
      if (code !== 0) return reject(Error("Local proposal command failed"));
      try {
        const line = stdout.split("\n").find((x) => x.startsWith("{"));
        const result = JSON.parse(line);
        if (!result.proposal?.id) throw Error();
        resolve(result);
      } catch {
        reject(Error("Invalid local proposal receipt"));
      }
    });
  });
}
async function pump() {
  if (busy || !connection || stopping) return;
  busy = true;
  try {
    const row = db
      .prepare(
        "SELECT * FROM inbox WHERE state IN ('queued','ready') ORDER BY created,id LIMIT 1",
      )
      .get();
    if (!row) return;
    let reply = row.reply;
    if (row.state === "queued") {
      db.prepare("UPDATE inbox SET attempts=attempts+1 WHERE id=?").run(row.id);
      try {
        const result = await generate(row);
        reply = JSON.stringify(
          sign(
            secret,
            9,
            [
              ["h", config.channel],
              ["p", config.owner],
            ],
            `Whiteboard proposal ${result.proposal.id} is ready for review. It has not been applied.\n${config.board_url}?workspace=${config.workspace}\nRequest: ${row.id}`,
          ),
        );
      } catch {
        if (row.attempts < 2) return;
        reply = JSON.stringify(
          sign(
            secret,
            9,
            [
              ["h", config.channel],
              ["p", config.owner],
            ],
            `The local whiteboard request did not complete. No automatic approval was performed. Please inspect the local job. Request: ${row.id}`,
          ),
        );
      }
      db.prepare("UPDATE inbox SET state='ready',reply=? WHERE id=?").run(
        reply,
        row.id,
      );
    }
    // Reuse the exact signed reply ID after an ambiguous disconnect; do not re-sign retries.
    await connection.publish(JSON.parse(reply));
    db.prepare("UPDATE inbox SET state='acknowledged' WHERE id=?").run(row.id);
  } catch {
    console.error("Bridge delivery pending; retrying with the same event ID.");
  } finally {
    busy = false;
  }
}
const statusPath = resolve(dir, "status.json");
const pulse = () => {
  const tmp = statusPath + ".tmp";
  writeFileSync(
    tmp,
    JSON.stringify({
      workspace: config.workspace,
      connected: Boolean(
        connection?.subscriptionReady && connection.socket.readyState === 1,
      ),
      updated: Date.now(),
    }),
    { mode: 0o600 },
  );
  renameSync(tmp, statusPath);
};
const heartbeat = setInterval(pulse, 2000);
pulse();
const timer = setInterval(() => void pump(), 1500);
process.on("SIGTERM", () => {
  stopping = true;
  activeChild?.kill("SIGTERM");
  connection?.close();
});
while (!stopping) {
  try {
    connection = await connectRelay(config.relay, secret, (event) => {
      const cmd = commandFromEvent(event, {
        owner: config.owner,
        bot,
        channel: config.channel,
        since,
      });
      if (!cmd) return;
      if (
        db
          .prepare(
            "SELECT count(*) AS n FROM inbox WHERE state!='acknowledged'",
          )
          .get().n >= 20
      )
        return;
      db.prepare(
        "INSERT OR IGNORE INTO inbox(id,instruction,created,state) VALUES(?,?,?,'queued')",
      ).run(cmd.id, cmd.instruction, cmd.created_at);
    });
    connection.subscribe(config.channel, config.owner, since);
    console.log(
      "Buzz board bridge authenticated; one owner/channel binding active.",
    );
    await new Promise((resolve) => connection.socket.once("close", resolve));
  } catch {
    console.error("Buzz connection unavailable; no channel access assumed.");
  }
  connection = null;
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, 5000));
}
while (busy) await new Promise((resolve) => setTimeout(resolve, 100));
clearInterval(timer);
clearInterval(heartbeat);
connection = null;
pulse();
db.close();
