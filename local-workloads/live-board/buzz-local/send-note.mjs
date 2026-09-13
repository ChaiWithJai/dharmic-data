// Local demo helper. Signs with the generated local test owner, not Jai's community identity.
import { readFileSync } from "node:fs";
import { connectRelay, sign } from "../buzz-protocol.mjs";
const file = process.argv[2];
if (!file)
  throw Error("Usage: node buzz-local/send-note.mjs path/to/instruction.txt");
const c = JSON.parse(readFileSync("buzz-local/bridge.json")),
  k = JSON.parse(readFileSync("buzz-local/identity.json"));
if (!["127.0.0.1", "localhost"].includes(new URL(c.relay).hostname))
  throw Error("This helper is for the isolated local relay only.");
const instruction = readFileSync(file, "utf8").trim();
if (!instruction || instruction.length > 3000)
  throw Error("Use an instruction of 1–3000 characters.");
const secret = Uint8Array.from(Buffer.from(k.owner_secret, "hex"));
const relay = await connectRelay(c.relay, secret);
const event = sign(
  secret,
  9,
  [
    ["h", c.channel],
    ["p", k.bot_pubkey],
  ],
  "!board-note " + instruction,
);
await relay.publish(event);
console.log(
  JSON.stringify({
    request_id: event.id,
    channel: c.channel,
    status: "accepted_by_local_relay",
    identity: "generated local test owner",
  }),
);
relay.close();
