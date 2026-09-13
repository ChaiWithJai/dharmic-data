import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSecretKey } from "nostr-tools/pure";
import { commandFromEvent, sign, getPublicKey } from "../buzz-protocol.mjs";
const owner = generateSecretKey(),
  bot = generateSecretKey(),
  other = generateSecretKey();
const c = {
  owner: getPublicKey(owner),
  bot: getPublicKey(bot),
  channel: "isolated-channel",
  since: Math.floor(Date.now() / 1000) - 5,
};
const build = (
  sk = owner,
  tags = [
    ["h", c.channel],
    ["p", c.bot],
  ],
  text = "!board-note Who is missing from this conversation?",
) => sign(sk, 9, tags, text);
test("only a signed configured owner/channel/mention can propose", () => {
  const e = build();
  assert.equal(
    commandFromEvent(e, c).instruction,
    "Who is missing from this conversation?",
  );
  assert.equal(commandFromEvent(build(other), c), null);
  assert.equal(
    commandFromEvent({ ...e, content: "!board-note tampered" }, c),
    null,
  );
  assert.equal(
    commandFromEvent(
      build(owner, [
        ["h", "other"],
        ["p", c.bot],
      ]),
      c,
    ),
    null,
  );
  assert.equal(commandFromEvent(build(owner, [["h", c.channel]]), c), null);
  assert.equal(
    commandFromEvent(
      build(owner, [
        ["h", c.channel],
        ["h", "other"],
        ["p", c.bot],
      ]),
      c,
    ),
    null,
  );
  assert.equal(commandFromEvent(build(bot), c), null);
});
test("old events, arbitrary commands and oversized instructions fail closed", () => {
  assert.equal(
    commandFromEvent(build(), {
      ...c,
      since: Math.floor(Date.now() / 1000) + 1,
    }),
    null,
  );
  assert.equal(
    commandFromEvent(build(owner, undefined, "!approve all"), c),
    null,
  );
  assert.equal(
    commandFromEvent(
      build(owner, undefined, "!board-note " + "x".repeat(3001)),
      c,
    ),
    null,
  );
  assert.equal(commandFromEvent({ invalid: true }, c), null);
});
