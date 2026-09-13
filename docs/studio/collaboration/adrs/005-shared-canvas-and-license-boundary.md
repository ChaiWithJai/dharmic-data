# ADR 005 — Shared canvas and license boundary

Status: proposed. Date: 2026-09-13.

## Context

The local app persists complete tldraw document snapshots with optimistic revision checks. That protects against a silent overwrite, but it does not merge simultaneous board edits or show live collaborators. Product language must distinguish asynchronous collaboration from real-time editing.

## Decision

The first local collaboration pilot may retain versioned snapshots with explicit conflicts and a visible editing handoff. An editor with stale state receives a conflict and can preserve their local snapshot before reloading. Never implement last-write-wins snapshot replacement and call it simultaneous collaboration.

A pilot requiring two people to manipulate the same board at once must add a qualified tldraw sync service. Its official documentation describes an authoritative room per document, separate asset handling, and a self-hosted production path. The provided templates still need application authentication and authorization. [tldraw sync](https://tldraw.dev/docs/sync)

For a self-hosted first implementation, prefer one small Node room service behind the application's authentication boundary, with durable room storage and a pinned matching client/server version. Enforce one authoritative room owner for each board. Route access through workspace membership; room IDs are locators, not authorization credentials. Board viewers receive read-only sessions, and membership revocation closes or reauthorizes their existing connections.

Keep application records—canonical briefs, approvals, and decisions—in the application database. Do not infer approval from synchronized shapes or cursor presence. Board assets must inherit workspace permissions and be included in backup/export. Disable remote unfurling until its source-access behavior is implemented and tested.

The SDK currently requires an appropriate license for production use. Existing local development usage is not proof of a license for distribution, hosted collaboration, or a paid product. Preserve attribution and obtain the appropriate license before that deployment. [License guidance](https://tldraw.dev/community/license)

## Consequences

Asynchronous collaboration ships with fewer operational components, but the UI must explain edit conflicts honestly. Real-time editing adds a room lifecycle, WebSocket permission handling, asset storage, schema migration, and release coordination. PostgreSQL for application data does not by itself provide tldraw room synchronization; use the room library's supported storage model and define its backup boundary separately.

The accessible card list, outline, and source links remain available when a user cannot operate the visual canvas. Library accessibility features do not certify custom views; verify actual keyboard paths, focus behavior, text alternatives, and magnification in the complete app. [tldraw accessibility](https://tldraw.dev/sdk-features/accessibility)

## Verification

For snapshot mode, two sessions edit the same revision and exactly one succeeds; the second can recover its work. For sync mode, simultaneous edits converge, reconnect/restart preserves the document, viewers cannot push writes, revoked users lose access, assets cannot cross workspaces, and a backup restores board plus assets. A mixed-version client receives a recoverable update path rather than corrupting the document. Do not mark the sync gate passed by testing two tabs attached to the old snapshot API.
