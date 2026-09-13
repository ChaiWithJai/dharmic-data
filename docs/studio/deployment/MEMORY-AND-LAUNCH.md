# Persistent memory and what blocks a live beta

Decision prepared 2026-09-13. MongoDB is a viable optional agent-memory store. A local authenticated instance and the official MongoDBStore persistence probe now work on this GB10. This is a bounded storage feasibility result, not an app-memory or model-quality result.

## The framework MongoDB provides

MongoDB's official LangGraph integration separates a checkpointer (agent execution/thread state) from a store (memory across sessions). We tested the latter without vector indexing. Metadata and exact-key retrieval do not require embeddings; semantic retrieval is a separate configuration and qualification. Do not copy a hosted embedding example and assume the data stays local. [Canonical MongoDB integration](https://www.mongodb.com/docs/atlas/ai-integrations/langgraph/).

The current worker is a single OpenAI-compatible request, not a LangGraph application. Installing a store does not make it remember. A useful memory path must deliberately retrieve authorized records into a bounded prompt and offer reviewed writes. Framework adoption should follow a real need for graph execution or resumable tasks; it is not necessary just to store a preference.

| State | Existing authority | MongoDB role |
|---|---|---|
| Documents, sources, invitations, approvals, jobs | Imagine Together SQLite today, PostgreSQL-capable | Do not migrate these for an agent-memory experiment |
| Community events and chat | Buzz's PostgreSQL/Redis/object storage deployment | MongoDB does not replace this stack without rewriting Buzz |
| Explicit learner preferences or approved project summaries | Not implemented as agent memory | Candidate scoped store |
| Running multi-step agent state | Current durable job ledger, no graph checkpointing | Optional LangGraph checkpointer if a graph is adopted later |
| Trace and evaluation evidence | MLflow | Keep it separate from memory and source authority |

If operating fewer databases becomes the priority, PostgreSQL-backed JSON memory is a reasonable alternative alongside the existing stack. The choice is not blocking first beta use. The local MongoDB instance remains isolated so this option can be evaluated or stopped without changing the app.

## What is now running

`imagine-memory-local` serves authenticated MongoDB 8.0.30 on `127.0.0.1:27019`, using named volume `imagine-memory-data`. Official image digest `sha256:4a0f30875898413139bec44c73c02a05fed172578de65b644dcdcee143ae7306` resolved to ARM64. Container resource caps: one CPU, 1 GiB memory, 0.25 GiB WiredTiger cache. A separate database-limited application user is provisioned. Secrets are protected local files, not repository contents.

Official `langgraph-store-mongodb` 0.4.0 was installed in a separate lab environment. The synthetic test covered write, filtered read, new-process read after container restart, other-namespace absence and deletion. No user material remains from this test. The app's dependencies, schema, active prompts and behavior were not changed. [Reproduction and operations](../../../local-workloads/memory-lab/README.md).

A namespace is not an access-control system. A client holding database credentials could choose another namespace. Authorization must remain in the server, with an internal service context derived from the logged-in user or verified Buzz identity.

## Smallest useful memory feature

Start with an explicit **Remember for this project** action on a user-selected preference or approved summary. The owner can inspect, correct and forget each memory. Default to project scope; never silently move a private memory into community scope. Do not automatically extract sensitive identity/health facts or treat model-generated claims as facts.

Proposed record fields: memory_id, workspace_id, subject_user_id or project scope, text, type, created_by, consent/action reference, source_card_ids/revisions, approval_status, created_at, expires_at, supersedes_id, deletion state. Proposed namespace: application → workspace → scope → subject. Derive it on the server, not from arbitrary model tool arguments.

Read sequence: authenticate → check current membership → select permitted records → reject expired/deleted/stale dependencies → retrieve within a small token budget → include as labeled reference data, never privileged instructions → log memory IDs/revisions and retrieval outcome, not private memory text by default.

Write sequence: model may propose a memory → user explicitly saves/edits → store the reviewed record → audit who accepted it. Revoke access immediately at application authorization even if physical deletion is asynchronous. Forget must cover store, indexes/caches and any permitted content trace copies. TTL cleanup alone is not immediate deletion or authorization.

Cross-database writes need an idempotent outbox/reconciliation process. Do not pretend an app SQL transaction also atomically updates MongoDB. If the memory service is unavailable, keep manual work usable and say memory was unavailable rather than pretending it was recalled.

Acceptance: with the same fixed task and source, compare a fresh session without memory against one with a user-approved preference. Verify correct preference use after process restart, no retrieval across private projects, stale-source handling, forget behavior and member revocation. Have the person assess whether it helped. Persistent storage success alone does not justify autonomous memory collection or RL.

## Local now; hosted later

Keep the MongoDB service off the public network. Use off-device encrypted backups and test restore before storing meaningful data. Restart policy only helps after Docker starts; host power/boot recovery remains a separate untested gate.

Later choices: retain a private self-managed instance or migrate to a managed MongoDB deployment. Both require TLS, scoped credentials, backups, retention and workload/cost tests. Preserve logical IDs/namespaces, export/import records and reconcile counts/content hashes during cutover. Record a migration checkpoint and rollback plan; a new connection string alone is not a verified migration. Vector search availability, ARM64 support and embedding locality must be qualified separately if added.

## What is actually stopping launch?

There is no unresolved need for an eight-node cluster. The app and local inference already work. The smallest live beta still needs these specific pieces:

| Gate | Work to complete | External input / implementation distinction |
|---|---|---|
| Netlify preview | Separate beta site, build config and route/CSP checks | Select/link the intended Netlify site; existing branded pipeline has not been inspected or modified |
| Shared application backend | Deploy authenticated API and persistent database reachable by beta users | Choose hosting; if everything stays on GB10, explicitly accept that an outage stops saved-work access too |
| Beta admission and privacy | Verified identity, one-guest policy, room/project permissions, explicit share snapshots, content-safe tracing | Implementation remains; MongoDB does not supply these policies |
| Buzz path | Inspect community, qualify ARM64 relay stack, link verified identities, build bounded Bonsai bridge | Actual community access/configuration is still needed; app and Buzz identities are not already linked |
| Operational readiness | Boot/restart, backup restoration, job deduplication, private usage ledger/report | Implementation and controlled tests remain; reports are still a plan |
| Real usefulness | Two actual participants use a real project | Their participation and consent are required; automated tests cannot replace this |

Recommended sequence: ship a synthetic Netlify preview → private two-person website with existing source-based AI → qualify Buzz as the optional conversation channel → add explicit memory only if returning users need it. Start with private projects and manual invitations; community discovery and one-guest self-service can follow their permission tests. No full school platform, GPU cluster or training program is required for that first useful release.

A local-only deployment can reduce recurring hosting costs before funding. It cannot provide the previously proposed off-device availability during power loss. Keep that tradeoff visible in the invitation and operating plan. Funding should expand a useful, measured service rather than pay for an untested assumption about demand.
