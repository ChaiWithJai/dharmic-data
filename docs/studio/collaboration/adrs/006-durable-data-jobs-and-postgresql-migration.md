# ADR 006 — Durable data, jobs, and PostgreSQL migration

Status: proposed. Date: 2026-09-13.

## Context

A local demo can survive with one API process and SQLite. A collaborative service must recover work independently of a browser or model connection, and must not lose approvals or duplicate model actions when a worker restarts. Adding a queue product alone does not provide those guarantees.

## Decision

Retain a small relational architecture. Use schema migrations from the first collaboration version. SQLite is acceptable for an explicitly bounded single-host pilot; serialize writes and keep the worker lifecycle independent of UI requests. Before a multi-instance production deployment, migrate application records to PostgreSQL through a measured migration and restore rehearsal.

Core tables: users, sessions, workspaces, memberships, sources, source revisions, cards, card revisions, boards, canonical documents, document revisions, review policies, approvals, decisions, jobs, job attempts, and evidence-outbox events. Every workspace-owned relation carries its scope, with foreign-key constraints preventing cross-workspace references. Store large assets as permissioned files/objects with hashes and metadata rather than embedding everything in database rows.

Persist job input manifests before enqueueing. A job contains the actor, workspace, selected immutable input versions, instruction/application/model configuration, resource budget, and state. Each execution attempt has a lease owner, heartbeat/expiry, timestamps, outputs, usage completeness, and error classification. Use an idempotency key for user submission and for committed output/evidence events.

One GB10 inference worker initially admits one model request at a time. Set per-workspace queue and generation limits. If a worker dies during an uncertain inference, retain an interrupted attempt and offer an explicit new attempt; do not silently resubmit an expensive request merely because its HTTP response was lost. Successful work is committed before the browser is notified. A retried commit cannot create another source card or apply the same suggestion twice.

For PostgreSQL, short transactions can atomically claim eligible queued jobs with row locks and `SKIP LOCKED`; commit the lease before performing inference outside the transaction. PostgreSQL documents that `SKIP LOCKED` is appropriate for queue-like consumers, while not providing a generally consistent view of arbitrary queries. [SELECT locking documentation](https://www.postgresql.org/docs/current/sql-select.html)

Delivery is at least once with deduplicated effects, not a claim that inference runs exactly once. Lease expiry, cancellation, and permission revocation must be checked before input reads and result delivery. A durable outbox retries MLflow publication independently, displaying evidence-sync state without rerunning the model.

## Migration and backup contract

Export an offline source snapshot with schema version and hashes. Import into PostgreSQL preserving object IDs, revision lineage, membership, review policy, and job history; verify counts and selected full-record hashes. Test isolation, stale approval rejection, and optimistic writes against the new database. Rehearse rollback before cutover. Do not run old and new databases as concurrent writable authorities.

A complete restore includes application data, board-room storage if used, files/assets, and the MLflow metadata/artifact pair. Individual workspace imports create new revision generations and cannot silently grant membership or revive approvals. Define retention of pre-import backups and failed attempts; a source repository is not the runtime backup system.

## Verification

Kill the worker before inference, during inference, and after output persistence but before acknowledgement. Restart and verify each job's honest state, absence of duplicate application, and retained error evidence. Restart the API during an approval write. Restore a full test workspace and compare content, approvals, source references, and access permissions. Run the same authorization/concurrency cases against SQLite and PostgreSQL before declaring the migration ready.
