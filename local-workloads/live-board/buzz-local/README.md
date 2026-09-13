# Local Buzz control proof

The local whiteboard now has a working Buzz command path. This is an **isolated private test relay**, with generated identities, not Jai’s existing community. It is intended to qualify the protocol before connecting real participants.

## Actual deployment

| Component | Verified local state |
|---|---|
| Buzz relay | Loopback `ws://127.0.0.1:18900`; Docker project `imagine-buzz-local` |
| Upstream revision | `4cd82f513214aad11c2b742ce7cc7c681e8e32a0` |
| Image index | `ghcr.io/block/buzz@sha256:1445fe15325f0cd6949ad249e8da39e3b75c3a2e5849c26331125358f31c115d` |
| ARM64 manifest | `sha256:e5b74d38778c1afb7aa37d897a4a80de17eaf897cc50f9844f5ca6978e27cc4c` |
| Dependencies | Separate Postgres, Redis, MinIO and Git volumes; existing app storage is untouched |
| Private test channel | `adeeed1c-9a1b-4afd-bc3f-0f4595a49abf` |
| Board binding | Existing local workspace `3d3cf6a6cb904f44b1539c73bbc1e293`; its separate live board |
| Bridge | User service `imagine-live-board-buzz`, one configured owner and channel |
| Identity | Generated local test owner; independently admitted bot key; no assertion this is Jai’s established Buzz identity |

The discovered image includes Linux ARM64 and the actual container became healthy on GB10. This supersedes the earlier unqualified ARM64 concern for this specific pinned **relay image**, not the desktop client.

## Try a command locally

From `local-workloads/live-board`, put your deliberately selected instruction in a text file and run:

```bash
node buzz-local/send-note.mjs data/my-instruction.txt
```

This helper signs and sends `!board-note <instruction>` with the bot mention tag to the isolated local channel. It uses the generated test owner identity and refuses non-loopback relays. The bridge asks Bonsai for a note, puts the result in the app’s pending proposals, then posts a signed acknowledgment and workspace review link in the channel. It does not approve the note. Open `http://127.0.0.1:8892?workspace=3d3cf6a6cb904f44b1539c73bbc1e293` with the existing local app account to review it.

An equivalent Buzz client message needs both the exact command prefix and a real `p` mention tag targeting the bot; textual `@name` alone is insufficient. The standalone bot must be admitted to the relay and to the private channel. The local test membership has already been provisioned. The owner helper is a local operator tool, not an end-user identity system or a replacement for Buzz’s client.

## Trust and boundaries

`buzz-protocol.mjs` uses `nostr-tools` to verify signatures and NIP-42 authentication. It accepts only kind-9 events signed by the configured owner, with exactly the configured channel tag and bot mention. Old events predating the adapter’s initial activation, future-dated events, other senders/channels, malformed signatures, unsupported commands and oversized instructions are ignored. The bot does not self-admit to private communities.

The backend’s sponsor membership check and proposal-only token remain a separate authorization layer. The generated Buzz test owner is explicitly labeled in MLflow; future calls use the initiating public key as trace user and record the local sponsor separately. This binding was operator-configured for the test. It is not automatic identity equivalence between an arbitrary Nostr key and Jai’s account.

Only the local `bonsai-propose.py` command is invoked with fixed argv, never a shell command from channel text. Channel content cannot grant tools, change the configured executable, choose another workspace or approve edits. The adapter does not read all boards or run a general autonomous tool loop. Multi-user authorization, per-channel policies and board-reading scope require another qualification stage.

## Persistence and replay

`data/buzz-bridge/inbox.sqlite3` stores the immutable binding, activation timestamp, unique command IDs, queued instructions, generation attempt counts, exact signed reply events and acknowledgment state. A different binding requires a different data directory. Instructions and replies are private local data, excluded from Git and MLflow artifacts.

On reconnect the relay is queried from the original activation timestamp; unique event IDs suppress already processed commands. This is acceptable for a small pilot but needs a paginated replay/checkpoint strategy for a large channel history. The pending queue is capped at 20; saturation currently ignores additional incoming commands until replay, so this is not a production delivery guarantee. Inspect the queue instead of promising every request was accepted by the bridge merely because the relay accepted it.

Generation retries reuse the local cached response and the backend’s idempotent proposal ID. Replies are signed once and retained before publishing, so an ambiguous acknowledgment retries the same event ID. Model failures retry up to three attempts and then send a failure response; failed requests do not apply changes. SIGTERM cancels a running proposal subprocess and leaves durable queued work available for recovery. Power interruption and prolonged network partitions have not been qualified.

A metadata-only heartbeat reports a connected, authenticated subscription to the app for its bound workspace. Stale or missing heartbeat becomes unavailable after ten seconds. This is connection health, not proof that all replies have been delivered. Pinned comments, conversations on shapes, approval notifications, and the complete board activity feed are not implemented by this narrow command adapter.

## Evidence

- Actual closed Buzz relay refused an unregistered identity.
- Signed owner command in the private channel triggered a real Bonsai request, a pending app proposal and an acknowledged signed reply containing its review link.
- Signature/author/channel/mention/time/size rejection tests passed.
- Bridge restart and replay of the identical real relay event retained the original command and proposal, without another model attempt.
- Existing multiplayer browser tests, proposal authorization tests and cursor/idle tests passed after integration.
- Browser review links select only a workspace belonging to the authenticated app account.

Receipts live under ignored `data/buzz-live-verification.json`, `data/buzz-request.json`, `data/buzz-replay-before.json`, and `data/buzz-bridge/`. Synthetic control messages are not human model-quality feedback. The initial successful model run before causal metadata was added is retained as historical integration evidence; the subsequent test records the generated Buzz owner and channel explicitly.

## Operations and recovery

```bash
sg docker -c 'docker compose --project-directory buzz-local -f buzz-local/compose.yml up -d'
systemctl --user start imagine-live-board-api imagine-live-board-web imagine-live-board-buzz
sg docker -c 'docker compose --project-directory buzz-local -f buzz-local/compose.yml ps'
systemctl --user status imagine-live-board-buzz
```

The relay stack has restart disabled for this test and the user services are not boot-enabled. After power loss, start the Docker stack first and confirm health, then the three user services. The adapter reconnects when the relay becomes available. Do not regenerate owner, bot or relay keys after a restart.

Protected files `.env`, `identity.json` and `bridge.json` contain secrets or access bindings and must not be committed, shared in a dashboard, or printed into logs. Keep a secure backup. Back up Postgres, Redis, MinIO/Git volumes, the board database, adapter database and protected configuration consistently before moving hosts. No full-stack restore has been tested. `docker compose down -v` destroys this relay’s persistent data; it is not a restart command.

To connect Jai’s existing community: inspect its actual relay revision and access policy, admit a dedicated bot, map a verified real owner public key and channel to the intended app principal/workspace, and use a fresh adapter data directory. Do not transplant the generated test owner identity as proof of a person’s identity. For remote review links, first qualify the licensed hosted canvas and authenticated WSS path. No existing community access, domain connection or remote deployment was performed here.

## Canonical references

- [Buzz countdown bot](https://github.com/block/buzz/tree/4cd82f513214aad11c2b742ce7cc7c681e8e32a0/examples/countdown-bot): direct WebSocket authentication and bounded bot commands.
- [Buzz Compose deployment](https://github.com/block/buzz/tree/4cd82f513214aad11c2b742ce7cc7c681e8e32a0/deploy/compose): actual relay dependencies and stable secret requirements.
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools): signing and verifying events; pinned dependency in package-lock.json.
- [Local live-board architecture](../README.md).
