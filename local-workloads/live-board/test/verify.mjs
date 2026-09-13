import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:8791",
  origin = "http://127.0.0.1:8790";
async function api(path, body, cookie = "", wid = "", method) {
  const r = await fetch(base + "/api" + path, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Cookie: cookie,
      "X-Workspace-ID": wid,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert(r.ok, JSON.stringify(data));
  return { data, cookie: r.headers.getSetCookie()[0]?.split(";")[0] || cookie };
}
const stamp = Date.now(),
  names = ["owner", "editor", "viewer", "outsider"];
const accounts = [];
for (const name of names)
  accounts.push(
    await api("/register", {
      name: `livefixture_${name}_${stamp}`,
      password: "Synthetic-fixture-only-93!",
    }),
  );
const w = await api(
    "/workspaces",
    { name: "Live board verification fixture" },
    accounts[0].cookie,
  ),
  wid = w.data.id;
for (const i of [1, 2]) {
  const invite = await api(
    `/workspaces/${wid}/invites`,
    { role: i === 1 ? "editor" : "viewer" },
    accounts[0].cookie,
    wid,
  );
  await api(
    "/invites/redeem",
    { token: invite.data.token },
    accounts[i].cookie,
  );
}
writeFileSync("data/test-fixture.json", JSON.stringify({ wid, accounts }), {
  mode: 0o600,
});
const browser = await chromium.launch({
  executablePath:
    "/home/chaiwithjai/Documents/code/ale/experiments/gb10/.browsers/chromium-1234/chrome-linux/chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const contexts = [],
  pages = [],
  errors = [];
try {
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 950 },
    });
    contexts.push(context);
    await context.addCookies([
      {
        name: "imagine_session",
        value: accounts[i].cookie.split("=")[1],
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    const page = await context.newPage();
    pages.push(page);
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(
      "http://127.0.0.1:8892" + (i === 0 ? "?workspace=" + wid : ""),
    );
    if (i !== 0) await page
      .getByRole("button", {
        name: new RegExp("Live board verification fixture"),
      })
      .click();
    await page.waitForFunction(() => window.__liveEditor?.getCurrentPageId());
  }
  await Promise.all(
    pages.slice(0, 2).map((p, i) =>
      p.evaluate((i) => {
        window.__liveEditor.createShape({
          id: "shape:human_" + i,
          type: "geo",
          x: 100 + i * 250,
          y: 100,
          props: { w: 180, h: 120 },
        });
      }, i),
    ),
  );
  for (const p of pages)
    await p.waitForFunction(() =>
      ["shape:human_0", "shape:human_1"].every((id) =>
        window.__liveEditor.getShape(id),
      ),
    );
  await pages[0].waitForFunction(
    () => window.__liveEditor.getCollaborators().length >= 2,
  );
  await pages[0].evaluate(() =>
    window.__liveEditor.setCamera({ x: 10, y: 30, z: 1.2 }),
  );
  await pages[0].mouse.move(500, 400);
  const point = await pages[0].evaluate(() =>
    window.__liveEditor.screenToPage({ x: 500, y: 400 }),
  );
  await pages[1].waitForFunction(
    ({ point, id }) => {
      const p = window.__liveEditor
        .getCollaborators()
        .find((p) => p.userId === "user:" + id);
      return (
        p?.cursor &&
        Math.abs(p.cursor.x - point.x) < 1 &&
        Math.abs(p.cursor.y - point.y) < 1
      );
    },
    { point, id: accounts[0].data.user.id },
  );
  // Hidden-tab presence is explicitly idle; then restore activity.
  await pages[1].evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await pages[0].waitForFunction(() =>
    window.__liveEditor
      .getCollaborators()
      .some(
        (p) => p.userName.includes("_editor_") && p.lastActivityTimestamp === 0,
      ),
  );
  await pages[1].evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await pages[0]
    .getByLabel("Unfinished thought")
    .fill(
      "Keep the applicant’s voice and invite the community to define the problem.",
    );
  await pages[0]
    .getByRole("button", { name: "Propose note", exact: true })
    .click();
  await pages[0].getByRole("button", { name: "Add to board" }).click();
  await pages[1].waitForFunction(() =>
    window.__liveEditor.getCurrentPageShapes().some((s) => s.meta.proposalId),
  );
  await pages[2].evaluate(() => {
    window.__liveEditor.updateInstanceState({ isReadonly: false });
    window.__liveEditor.createShape({ id: "shape:forbidden", type: "geo" });
  });
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(
    await pages[0].evaluate(
      () => !!window.__liveEditor.getShape("shape:forbidden"),
    ),
    false,
  );
  await contexts[1].setOffline(true);
  await contexts[1].setOffline(false);
  await pages[1].reload();
  await pages[1]
    .getByRole("button", {
      name: new RegExp("Live board verification fixture"),
    })
    .click();
  await pages[1].waitForFunction(() =>
    window.__liveEditor?.getShape("shape:human_0"),
  );
  const response = await fetch(
    `http://127.0.0.1:8893/live/rooms/${wid}/snapshot`,
    { headers: { Cookie: accounts[3].cookie } },
  );
  assert.equal(response.status, 403);
  await api(
    `/workspaces/${wid}/members/${accounts[1].data.user.id}`,
    null,
    accounts[0].cookie,
    wid,
    "DELETE",
  );
  await pages[1].waitForFunction(
    () => document.body.textContent.includes("Workspace access denied"),
    { timeout: 10000 },
  );
  await pages[0].screenshot({ path: "data/live-board-verified.png" });
  assert.deepEqual(errors, []);
  const report = {
    status: "passed",
    checks: [
      "two-account concurrent edits converge",
      "three-account presence, cursor coordinates under zoom/pan, hidden-tab idle",
      "proposal accepted and synchronized",
      "viewer cannot bypass read-only UI",
      "network reconnect retains document",
      "outsider denied",
      "membership revocation removes access",
    ],
    browser_errors: errors.length,
    workspace_fixture: wid,
  };
  writeFileSync("data/verification.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
