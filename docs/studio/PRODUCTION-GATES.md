# From this working pilot to a service anyone can use

The collaboration fork is a **local, asynchronous pilot**, derived from the accepted personal app. It has separate named accounts, owner/editor/viewer access, scoped workspaces, versioned briefs, explicit reviews, decisions and a durable model queue. Its relational storage can use PostgreSQL. None of those facts establishes an Internet service's capacity or operational readiness.

The immediate value proposition is: **keep a grant team's sources, unfinished thinking and exact decisions connected, so people can return to the same understanding.** Grant writers working with clients and small community project teams are the initial buyer hypotheses. There is no measured willingness to pay or grant-award improvement yet.

## Implemented and still to qualify

| Capability | This fork | Before an invited network service |
|---|---|---|
| Capture and canvas | Real source cards and tldraw snapshots; explicit conflict recovery | Accessibility sessions with actual participants; asset size/storage policy |
| Identity | Named local accounts, scrypt password hashing, expiring opaque HttpOnly sessions | Established OIDC/account recovery, verified account lifecycle, HTTPS, rate limits and security review |
| Workspace isolation | Server-side membership on every scoped route; owner/editor/viewer roles | Adversarial tenant tests under deployed reverse proxy and storage configuration |
| Canonical alignment | Required reviewers approve exact brief/source versions; changes make approval stale | Actual two-person use and review-policy usability |
| Database | SQLAlchemy schema, SQLite local default; behavioral suite exercised on PostgreSQL16 | Versioned migrations, production backup/restore and SQLite-to-Postgres data migration rehearsal |
| Jobs | Persisted inputs, DB claim, bounded worker, lease expiry marked interrupted | Idempotency keys, evidence outbox, cancellation, quotas, load/failure-injection tests |
| Canvas collaboration | Asynchronous snapshot handoff with one successful writer per revision | Qualified tldraw room sync if simultaneous editing is promised; production license |
| Model evidence | Operator-only MLflow; application-scoped evidence download | Tenant retention/deletion policies, export access review, failure/retry observability |
| Learning continuation | Optional Maven links, no private text in URLs | Confirm actual workshop booking destination; measure interest separately from enrollment |

The server currently rejects non-local hostnames and refuses a production-mode start. That guard makes the deployment status explicit. It should be replaced only through a reviewed release that satisfies the network-service column—not by describing this pilot as already production-ready.

## The next product experiment

Start with one grant writer and one collaborator on a single real project. Both bring material. Ask them to write a short canonical brief, preserve an unresolved disagreement, review a revision, change one claim and return later to explain the new decision. The test succeeds when both can find the sources, understand what was agreed, and use the exported brief for their next action.

Observe concrete friction: lost source, overwritten thought, stale approval mistaken for current agreement, uncertainty hidden by generated prose, or a suggestion worth keeping. Record human time separately from model latency. Do not infer grant success or model superiority from completing the workflow.

After that pair finds it useful, try a second independent project. A recurring need and willingness to continue are prerequisites to choosing a hosted subscription, paid setup/support, or workshop-supported community model. The software gives the workshop a real project to teach from; the workshop is an optional continuation of the same practice.

## Scale architecture

Keep stateless HTTP replicas behind authenticated HTTPS, PostgreSQL as the application authority, durable workers with bounded provider capacity, permissioned asset storage, and operator-only MLflow. If needed, introduce one authoritative tldraw sync room per board as a separate service. Do not use whole-document HTTP replacement as live multiplayer synchronization.

Use the [Astra ADRs](collaboration/README.md) for design rationale and the [pilot acceptance plan](collaboration/PILOT-ACCEPTANCE.md) for participant testing. Those documents include capabilities still proposed; the implementation receipt is the authority for what has actually been tested.
