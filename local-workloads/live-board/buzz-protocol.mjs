// Narrow NIP-42/NIP-29 transport based on Buzz's canonical countdown-bot example.
import WebSocket from "ws";
import { finalizeEvent, verifyEvent, getPublicKey } from "nostr-tools/pure";
export { finalizeEvent, getPublicKey };
export function commandFromEvent(
  input,
  { owner, bot, channel, since },
  now = Math.floor(Date.now() / 1000),
) {
  try {
    const e = JSON.parse(JSON.stringify(input)); // No cached verification flag from a caller.
    if (
      !verifyEvent(e) ||
      e.kind !== 9 ||
      e.pubkey !== owner ||
      e.pubkey === bot ||
      e.created_at < since ||
      e.created_at > now + 60
    )
      return null;
    const h = e.tags.filter((t) => t[0] === "h");
    if (h.length !== 1 || h[0][1] !== channel) return null;
    if (!e.tags.some((t) => t[0] === "p" && t[1] === bot)) return null;
    if (!e.content.startsWith("!board-note ")) return null;
    const instruction = e.content.slice(12).trim();
    if (!instruction || instruction.length > 3000) return null;
    return {
      id: e.id,
      instruction,
      author: e.pubkey,
      created_at: e.created_at,
    };
  } catch {
    return null;
  }
}
export function sign(secret, kind, tags, content = "") {
  return finalizeEvent(
    { kind, created_at: Math.floor(Date.now() / 1000), tags, content },
    secret,
  );
}
export async function connectRelay(url, secret, onEvent = () => {}) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "wss:" &&
    !(
      parsed.protocol === "ws:" &&
      ["127.0.0.1", "localhost"].includes(parsed.hostname)
    )
  )
    throw Error("Use TLS or a loopback relay.");
  const socket = new WebSocket(url, { maxPayload: 256 * 1024 });
  const pending = new Map();
  let authId,
    subscriptionReady = false;
  let resolveAuth, rejectAuth;
  const ready = new Promise((resolve, reject) => {
    resolveAuth = resolve;
    rejectAuth = reject;
  });
  const authTimer = setTimeout(
    () => rejectAuth(Error("Relay authentication timed out")),
    10000,
  );
  const send = (message) => {
    if (socket.readyState !== WebSocket.OPEN) throw Error("Relay disconnected");
    socket.send(JSON.stringify(message));
  };
  socket.on("message", (bytes) => {
    try {
      const m = JSON.parse(bytes.toString());
      if (m[0] === "AUTH") {
        const e = sign(secret, 22242, [
          ["relay", url],
          ["challenge", m[1]],
        ]);
        authId = e.id;
        send(["AUTH", e]);
      }
      if (m[0] === "OK") {
        if (m[1] === authId) {
          clearTimeout(authTimer);
          m[2]
            ? resolveAuth()
            : rejectAuth(Error("Relay rejected authentication"));
        }
        const p = pending.get(m[1]);
        if (p) {
          pending.delete(m[1]);
          clearTimeout(p.timer);
          m[2] ? p.resolve() : p.reject(Error("Relay rejected event"));
        }
      }
      if (m[0] === "EOSE") subscriptionReady = true;
      if (m[0] === "CLOSED") socket.close();
      if (m[0] === "EVENT") onEvent(m[2]);
    } catch {
      /* Malformed relay traffic does not execute commands. */
    }
  });
  socket.on("error", () => rejectAuth(Error("Relay connection failed")));
  socket.on("close", () => {
    clearTimeout(authTimer);
    rejectAuth(Error("Relay closed"));
    for (const p of pending.values()) {
      clearTimeout(p.timer);
      p.reject(Error("Relay disconnected before acknowledgment"));
    }
    pending.clear();
  });
  try {
    await ready;
  } catch (e) {
    socket.close();
    throw e;
  }
  return {
    socket,
    get subscriptionReady() {
      return subscriptionReady;
    },
    subscribe(channel, owner, since) {
      send([
        "REQ",
        "imagine-board",
        { kinds: [9], authors: [owner], "#h": [channel], since },
      ]);
    },
    publish(event) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(event.id);
          reject(Error("Event acknowledgment timed out"));
        }, 10000);
        pending.set(event.id, { resolve, reject, timer });
        try {
          send(["EVENT", event]);
        } catch (e) {
          clearTimeout(timer);
          pending.delete(event.id);
          reject(e);
        }
      });
    },
    close() {
      socket.close();
    },
  };
}
