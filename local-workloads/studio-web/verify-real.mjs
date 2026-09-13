throw new Error("Historical personal-app script is disabled in this fork. Use verify-collaboration.mjs on port 8790.");
// Explicitly authorized local API verification. No AI request or feedback is sent.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const initial = await (await fetch("http://127.0.0.1:8781/api/export")).json();
assert.equal(
  initial.cards.length,
  0,
  "This check requires the agreed empty workspace",
);
await fs.writeFile(
  new URL("./verification/pre-real-test.json", import.meta.url),
  JSON.stringify(initial, null, 2),
);
const browser = await chromium.launch({
  executablePath:
    "/home/chaiwithjai/Documents/code/ale/experiments/gb10/.browsers/chromium-1234/chrome-linux/chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    locale: "en-US",
  }),
  errors = [],
  network = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (dialog) => dialog.accept());
page.on("request", (r) => {
  if (r.url().includes("/api/"))
    network.push({ method: r.method(), url: r.url() });
});
let completed = false;
try {
  await page.goto("http://127.0.0.1:8780");
  await page.locator(".tl-canvas").waitFor();
  await page
    .getByRole("button", { name: "Capture something", exact: false })
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Verification fixture — remove after browser test");
  await page
    .getByLabel("Source URL or reference")
    .fill("https://example.com/verification");
  await page
    .getByLabel("Original passage", { exact: true })
    .fill("A source quotation used only for application verification.");
  await page
    .getByLabel("Your note", { exact: true })
    .fill("Temporary test note. This is not Jai’s personal writing.");
  await page.getByLabel("Theme", { exact: true }).selectOption("Courage");
  await page.getByRole("button", { name: "Save to swipe file" }).click();
  await page
    .getByRole("button", { name: "Add to canvas", exact: false })
    .click();
  await page.locator(".tl-shape").first().waitFor();
  await page.waitForTimeout(1200);
  const first = await (await fetch("http://127.0.0.1:8781/api/board")).json(),
    original = Object.values(first.snapshot.store).find(
      (r) => r.typeName === "shape",
    );
  assert.ok(original);
  const shape = page.locator(".tl-shape").first(),
    box = await shape.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 35);
  await page.mouse.down();
  await page.mouse.move(box.x + 115, box.y + 80, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  const moved = await (await fetch("http://127.0.0.1:8781/api/board")).json();
  assert.notEqual(
    Object.values(moved.snapshot.store).find((r) => r.typeName === "shape").x,
    original.x,
  );
  await shape.dblclick({ position: { x: 80, y: 65 } });
  const editable = page.locator("[contenteditable=true]").first();
  await editable.waitFor();
  await editable.fill(
    "Edited canvas copy — the library source stays unchanged.",
  );
  await page.keyboard.press("Escape");
  await page.locator(".canvas-heading h2").click();
  await page.waitForTimeout(1200);
  const afterEdit = await (
    await fetch("http://127.0.0.1:8781/api/export")
  ).json();
  assert.equal(
    afterEdit.cards[0].quote,
    "A source quotation used only for application verification.",
  );
  assert.ok(
    JSON.stringify(afterEdit.board.snapshot).includes("Edited canvas copy"),
  );
  await page.reload();
  await page.locator(".tl-shape").first().waitFor();
  await page
    .locator(".tl-shape")
    .getByText("Edited canvas copy — the library source stays unchanged.", {
      exact: true,
    })
    .first()
    .waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Your note", { exact: true })
    .fill("Explicit manual edit in the library.");
  await page.getByRole("button", { name: "Save to swipe file" }).click();
  await page.waitForTimeout(200);
  await page
    .getByRole("searchbox", { name: "Search your swipe file" })
    .fill("no-match-xyz");
  await page.getByText("Try a different search or theme.").waitFor();
  await page
    .getByRole("searchbox", { name: "Search your swipe file" })
    .fill("");
  await page.getByRole("button", { name: "Passion", exact: true }).click();
  await page.getByText("Try a different search or theme.").waitFor();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.screenshot({
    path: new URL("./verification/real-workspace-fixture.png", import.meta.url)
      .pathname,
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  await download.saveAs(
    new URL("./verification/real-export-fixture.json", import.meta.url)
      .pathname,
  );
  const exported = JSON.parse(
    await fs.readFile(
      new URL("./verification/real-export-fixture.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(exported.cards[0].note, "Explicit manual edit in the library.");
  assert.ok(
    JSON.stringify(exported.board.snapshot).includes("Edited canvas copy"),
  );
  await page
    .getByRole("button", { name: "Delete Verification fixture", exact: false })
    .click();
  await page.waitForTimeout(250);
  assert.equal(
    (await (await fetch("http://127.0.0.1:8781/api/cards")).json()).cards
      .length,
    0,
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "real-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
  await page
    .getByRole("button", {
      name: "Verification fixture — remove after browser test",
      exact: true,
    })
    .waitFor();
  await page
    .locator(".tl-shape")
    .getByText("Edited canvas copy — the library source stays unchanged.", {
      exact: true,
    })
    .first()
    .waitFor();
  assert.deepEqual(errors, []);
  assert.equal(
    network.filter(
      (r) => r.url.endsWith("/api/ai") || r.url.endsWith("/feedback"),
    ).length,
    0,
  );
  completed = true;
} catch (error) {
  await page.screenshot({
    path: new URL("./verification/real-failure.png", import.meta.url).pathname,
    fullPage: true,
  });
  console.error(errors);
  throw error;
} finally {
  const current = await (await fetch("http://127.0.0.1:8781/api/cards")).json();
  assert.ok(
    current.cards.every(
      (c) => c.title === "Verification fixture — remove after browser test",
    ),
    "Unexpected cards appeared: do not overwrite",
  );
  await page.evaluate(async (backup) => {
    const r = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backup),
    });
    if (!r.ok) throw new Error(await r.text());
  }, initial);
  const cleaned = await (
    await fetch("http://127.0.0.1:8781/api/export")
  ).json();
  assert.equal(cleaned.cards.length, 0);
  assert.deepEqual(cleaned.board.snapshot, initial.board.snapshot);
  await fs.writeFile(
    new URL("./verification/real-result.json", import.meta.url),
    JSON.stringify(
      {
        status: completed ? "PASS" : "FAIL",
        scope:
          "real local API and tldraw browser, temporary explicitly labeled fixture",
        checks: [
          "capture",
          "canvas add",
          "drag persists",
          "canvas text editing",
          "source quotation unchanged",
          "reload",
          "manual library edit",
          "search",
          "theme filter",
          "export",
          "delete",
          "restore",
        ],
        page_errors: errors,
        inference_calls: 0,
        human_feedback_submitted: 0,
        cleanup:
          "initial empty workspace restored; pre-restore backups retained by backend",
      },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(
  "PASS real API UI flow; fixture cleaned; no inference or feedback submitted.",
);
