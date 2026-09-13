import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
const fixture = JSON.parse(readFileSync("data/test-fixture.json"));
const dir = mkdtempSync(join(tmpdir(), "imagine-agent-contract-"));
const token = randomBytes(32).toString("hex");
const wid = fixture.wid,
  origin = "http://127.0.0.1:8892";
const url = `http://127.0.0.1:18893/agent/rooms/${wid}/proposals`;
let child;
before(async () => {
  child = spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      LIVE_PORT: "18893",
      LIVE_DATA_DIR: dir,
      LIVE_AGENT_TOKEN: token,
      LIVE_AGENT_WORKSPACE: wid,
      LIVE_AGENT_ACTOR: fixture.accounts[0].data.user.id,
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null)
      throw Error("Isolated contract backend exited");
    try {
      const r = await fetch("http://127.0.0.1:18893/live/health");
      if (r.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error("Isolated contract backend did not start");
});
after(async () => {
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await exited;
  }
  rmSync(dir, { recursive: true, force: true });
});
async function post(u, p, credential = token) {
  return fetch(u, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + credential,
    },
    body: JSON.stringify(p),
  });
}
test("agent operations are bounded and replay-safe", async () => {
  const payload = {
    text: "Synthetic bridge verification — do not treat as human feedback.",
    x: 100,
    y: 100,
    event_id: "contract_" + Date.now(),
  };
  assert.equal((await post(url, payload, "invalid")).status, 403);
  assert.equal(
    (await post(url.replace(wid, "0".repeat(32)), payload)).status,
    403,
  );
  assert.equal((await post(url, { ...payload, text: "" })).status, 422);
  const first = await post(url, payload);
  assert.equal(first.status, 201);
  const a = await first.json();
  assert.equal(a.applied, false);
  const replay = await post(url, payload);
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).id, a.id);
  assert.equal(
    (await post(url, { ...payload, text: "different" })).status,
    409,
  );
  assert.equal((await post(url + "/" + a.id + "/accept", {})).status, 403);
});
test("cross-origin login rejected before credential processing", async () => {
  const r = await fetch("http://127.0.0.1:8893/live/login", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(r.status, 403);
});
test("authenticated snapshot and event ledger survive later service restarts", async () => {
  const headers = { Cookie: fixture.accounts[0].cookie, Origin: origin };
  const r = await fetch(
    `http://127.0.0.1:8893/live/rooms/${fixture.wid}/snapshot`,
    { headers },
  );
  assert.equal(r.status, 200);
  const s = JSON.stringify(await r.json());
  assert(s.includes("shape:human_0"));
  assert(s.includes("shape:human_1"));
  assert(s.includes("shape:proposal_"));
  const e = await fetch(
    `http://127.0.0.1:8893/live/rooms/${fixture.wid}/events`,
    { headers },
  );
  const events = (await e.json()).events;
  assert(events.some((e) => e.kind === "board_record_insert"));
  assert(events.some((e) => e.kind === "proposal_accept"));
});
