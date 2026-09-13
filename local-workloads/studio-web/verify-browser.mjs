// Browser contract test. API responses are in-memory fixtures; no live cards or inference are changed.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
await fs.mkdir(new URL("./verification/", import.meta.url), {
  recursive: true,
});
const browser = await chromium.launch({
  executablePath:
    "/home/chaiwithjai/Documents/code/ale/experiments/gb10/.browsers/chromium-1234/chrome-linux/chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1500, height: 980 },
  locale: "en-US",
});
const errors = [],
  external = [];
let cards = [],
  board = { snapshot: null, revision: 0 },
  counter = 0,
  conflict = false,
  aiRequests = 0,
  feedbackRecords = [],
  researchImports = 0;
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (request) => {
  if (
    !request.url().startsWith("http://127.0.0.1:8780") &&
    !request.url().startsWith("data:") &&
    !request.url().startsWith("blob:")
  )
    external.push(request.url());
});
page.on("dialog", (dialog) => dialog.accept());
await page.route("**/api/**", async (route) => {
  const req = route.request(),
    path = new URL(req.url()).pathname.replace("/api", ""),
    method = req.method(),
    body = req.postDataJSON();
  let result = {};
  let status = 200;
  if (path === "/cards" && method === "GET") result = { cards };
  else if (path === "/cards" && method === "POST") {
    const card = {
      ...body,
      id: "fixture-" + ++counter,
      revision: 1,
      created_at: "2026-09-13",
      updated_at: "2026-09-13",
    };
    cards.push(card);
    result = card;
  } else if (path.startsWith("/cards/") && method === "PUT") {
    const id = path.split("/")[2],
      old = cards.find((c) => c.id === id);
    if (old.revision !== body.revision) {
      status = 409;
      result = { detail: "Card changed" };
    } else {
      result = { ...body, id, revision: old.revision + 1 };
      cards = cards.map((c) => (c.id === id ? result : c));
    }
  } else if (path.startsWith("/cards/") && method === "DELETE") {
    cards = cards.filter((c) => c.id !== path.split("/")[2]);
    result = { ok: true };
  } else if (path === "/board" && method === "GET") result = board;
  else if (path === "/board" && method === "PUT") {
    if (conflict || body.revision !== board.revision) {
      status = 409;
      result = { detail: "Board changed" };
    } else {
      board = { snapshot: body.snapshot, revision: board.revision + 1 };
      result = board;
    }
  } else if (path === "/research/import") {
    researchImports++;
    result = { added: 0, skipped: 0 };
  } else if (path === "/ai") {
    aiRequests++;
    result = { job_id: "fixture-job" };
  } else if (path.endsWith("/feedback")) {
    feedbackRecords.push(body);
    result = { saved: true };
  } else if (path.startsWith("/jobs/"))
    result =
      aiRequests === 1
        ? {
            state: "succeeded",
            result: {
              text: "Fixture suggestion: What small step would make this question concrete?",
            },
            trace_url: "http://127.0.0.1:5001/#/experiments/1",
          }
        : {
            state: "interrupted",
            error: "Fixture restart interrupted this request.",
          };
  else if (path === "/export") result = { version: 1, cards, board };
  else if (path === "/import") {
    cards = body.cards;
    board = { ...body.board, revision: board.revision + 1 };
    result = { ok: true };
  } else {
    status = 404;
    result = { detail: "Unhandled fixture route " + path };
  }
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(result),
  });
});
try {
  await page.goto("http://127.0.0.1:8780");
  await page.getByText("Your thinking canvas", { exact: true }).waitFor();
  await page.locator(".tl-canvas").waitFor();
  await page
    .getByRole("button", { name: "Add 30 grant examples", exact: false })
    .click();
  await page
    .getByText("Added 0 grant research cards;", { exact: false })
    .waitFor();
  assert.equal(researchImports, 1);
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          version: 1,
          cards: [],
          board: { snapshot: { broken: true }, revision: 0 },
        }),
      ),
    });
  await page.locator(".error-toast").waitFor();
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  assert.equal(board.snapshot, null);
  await page.screenshot({
    path: new URL("./verification/empty-workspace.png", import.meta.url)
      .pathname,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Capture something", exact: false })
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Verification fixture — a question worth keeping");
  await page
    .getByLabel("Source URL or reference")
    .fill("https://example.com/source");
  await page
    .getByLabel("Original passage")
    .fill("This is a clearly labeled browser verification fixture.");
  await page
    .getByLabel("Your note", { exact: true })
    .fill("My fixture note stays separate from the quotation.");
  await page.getByLabel("Theme", { exact: true }).selectOption("Courage");
  await page
    .getByRole("button", { name: "Save to swipe file", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add to canvas", exact: false })
    .click();
  await page.locator(".tl-shape").first().waitFor();
  await page.waitForTimeout(1300);
  assert.ok(board.snapshot);
  const record = Object.values(board.snapshot.store).find(
    (r) => r.typeName === "shape",
  );
  assert.equal(record.meta.sourceCardId, cards[0].id);
  const shape = page.locator(".tl-shape").first(),
    box = await shape.boundingBox();
  await page.mouse.move(box.x + 50, box.y + 45);
  await page.mouse.down();
  await page.mouse.move(box.x + 170, box.y + 115, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1100);
  const moved = Object.values(board.snapshot.store).find(
    (r) => r.typeName === "shape",
  );
  assert.notEqual(moved.x, record.x);
  await page
    .getByLabel(
      "Select Verification fixture — a question worth keeping for Bonsai",
    )
    .check();
  await page.getByRole("button", { name: "Ask Bonsai", exact: false }).click();
  await page
    .getByRole("button", { name: "Ask me questions", exact: true })
    .click();
  await page.getByRole("button", { name: "Make a suggestion" }).click();
  await page.getByText("Fixture suggestion:", { exact: false }).waitFor();
  assert.equal(aiRequests, 1);
  assert.equal(
    cards[0].note,
    "My fixture note stays separate from the quotation.",
  );
  await page
    .getByLabel("What would make it better? (optional)")
    .fill("Browser fixture feedback, not a human evaluation.");
  await page.getByRole("button", { name: "Not useful", exact: true }).click();
  await page.getByText("Feedback saved to this request’s trace.").waitFor();
  assert.equal(feedbackRecords[0].value, false);
  await page.getByRole("button", { name: "Append to", exact: false }).click();
  await page.waitForTimeout(200);
  assert.ok(cards[0].note.includes("Fixture suggestion"));
  assert.equal(
    cards[0].quote,
    "This is a clearly labeled browser verification fixture.",
  );
  await page.screenshot({
    path: new URL("./verification/workspace-with-fixture.png", import.meta.url)
      .pathname,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Discard suggestion" }).click();
  await page.getByRole("button", { name: "Make a suggestion" }).click();
  await page.getByText("Fixture restart interrupted this request.").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Make a suggestion" }).isEnabled(),
    true,
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  await download.saveAs(
    new URL("./verification/export-fixture.json", import.meta.url).pathname,
  );
  const exported = JSON.parse(
    await fs.readFile(
      new URL("./verification/export-fixture.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(exported.cards.length, 1);
  assert.ok(exported.board.snapshot);
  await page.reload();
  await page.locator(".tl-shape").first().waitFor();
  assert.equal(
    Object.values(board.snapshot.store).find((r) => r.typeName === "shape").x,
    moved.x,
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Your note", { exact: true })
    .fill("An explicit manual edit.");
  await page.getByRole("button", { name: "Save to swipe file" }).click();
  assert.equal(
    cards[0].quote,
    "This is a clearly labeled browser verification fixture.",
  );
  await page
    .getByRole("button", { name: "Delete Verification fixture", exact: false })
    .click();
  await page.waitForTimeout(100);
  assert.equal(cards.length, 0);
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "fixture-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
  await page
    .getByRole("button", {
      name: "Verification fixture — a question worth keeping",
      exact: true,
    })
    .waitFor();
  assert.equal(cards.length, 1);
  conflict = true;
  await page
    .getByRole("button", { name: "Add to canvas", exact: false })
    .click();
  await page
    .getByText("The board changed in another tab.", { exact: false })
    .waitFor();
  await page.getByRole("button", { name: "Download current board" }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: new URL("./verification/mobile-fixture.png", import.meta.url)
      .pathname,
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    new URL("./verification/result.json", import.meta.url),
    JSON.stringify(
      {
        status: "PASS",
        scope: "mocked API browser contract; no real user cards or inference",
        checks: [
          "empty workspace",
          "capture",
          "real tldraw note creation",
          "drag persistence",
          "source quote preserved on explicit AI apply",
          "export",
          "reload",
          "manual edit",
          "delete",
          "restore",
          "optimistic conflict visible",
          "390px no horizontal overflow",
        ],
        page_errors: errors,
        external_requests: external,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: frontend browser workflow; mocked API only. External requests:",
    external,
  );
} catch (error) {
  await page.screenshot({
    path: new URL("./verification/failure.png", import.meta.url).pathname,
    fullPage: true,
  });
  console.error("PAGE ERRORS", errors);
  console.error((await page.locator("body").innerText()).slice(-2500));
  throw error;
} finally {
  await browser.close();
}
