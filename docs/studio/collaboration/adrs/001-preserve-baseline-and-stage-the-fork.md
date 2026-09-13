# ADR 001 — Preserve the accepted baseline and stage the collaboration fork

Status: proposed for the collaborative fork. Date: 2026-09-13.

## Context

Jai expressed approval of the local Studio experience and asked to preserve it before extending it for collaborators. The existing browser evidence covers a single-user app. Collaboration changes identity, data ownership, conflict resolution, and what an approval means; those changes should be reviewable without replacing the accepted installation.

## Decision

Publish an exact, reviewable baseline commit with its source, lockfiles, architecture record, documented commands, and sanitized verification receipt. Preserve the baseline's working configuration and private local data separately. Record the actual repository/commit/tag once publication succeeds; do not put tokens, private checkpoint weights, generated personal notes, database files, or private MLflow artifacts into a source repository.

Create the collaboration fork as a separate checkout, with a distinct service name, port, database path, and experiment identity. Whether GitHub represents that as a fork or a new repository derived from the commit is a publication choice for the root agent; lineage must identify the preserved commit in either case.

Sequence the fork:

1. Workspace/authorship schema and server-enforced membership.
2. Named-account asynchronous collaboration and optimistic conflicts.
3. Canonical-brief revisions, explicit review, and decision history.
4. Scoped Bonsai assistance, durable jobs, and attributable MLflow evidence.
5. A separate qualification of simultaneous canvas synchronization and any externally accessible deployment.

The running local app remains available during this sequence. Migration is opt-in and includes a verified export, a restore rehearsal, and a recorded destination. No copied baseline database becomes a public example dataset merely because source code is published.

## Alternatives and consequences

Changing the accepted installation directly would make regressions and data migrations harder to separate. Rebuilding everything from scratch would discard the tested interaction model. A derived fork retains the useful interface while giving collaboration contracts their own version history.

Some bug fixes should later flow back to the baseline through small reviewed changes. Changes to identity, collaboration, or data migration do not silently flow back.

## Verification

The preserved commit can build from its lockfile; a new clone contains no private runtime state; baseline and fork can run without sharing mutable storage; and a restored baseline export matches its recorded content hashes. A collaboration demo names its actual implemented stage, not the entire roadmap.
