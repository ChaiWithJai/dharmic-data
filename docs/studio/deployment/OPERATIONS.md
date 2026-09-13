# GB10 and Buzz operations / power-loss runbook

Proposed operating procedure. No power test, restart, BIOS change, UPS installation or service enablement was performed for this planning task.

## Observed today

The three Imagine Together user services are running but disabled for boot; `loginctl show-user chaiwithjai -p Linger` returns `Linger=no`. They cannot be described as unattended-reboot-ready. No Buzz unit appeared in the inspected user-service list; this is not proof that no Buzz process exists elsewhere. A production Buzz deployment was not verified.

Buzz's canonical single-node Compose bundle requires Postgres, Redis, MinIO and a git data volume. It calls for stable secrets and a pinned image, and documents Compose v2.24.4+. Confirm image architecture for ARM64 and the required GB10 host kernel/runtime before installation; x86 desktop packaging says nothing about server image support. [Pinned deployment README](https://github.com/block/buzz/blob/4cd82f513214aad11c2b742ce7cc7c681e8e32a0/deploy/compose/README.md).

## Before inviting users

- Assign a dedicated service account and protected data paths; isolate workloads from Jai's personal research and other GPU applications.
- Pin Buzz image/source, schema version, agent bridge, model file SHA256, llama.cpp fork/build and configuration. Verify actual checkpoint provenance; a filename is not proof of base-model lineage.
- Install supervised boot services with bounded restarts and health checks. Prefer system services for unattended use, or explicitly configure user services plus lingering. Enabling a user unit alone does not solve the current no-linger condition.
- Order startup by readiness: network/time/storage → Buzz database/cache/object storage → migrations when explicitly scheduled → relay → telemetry/MLflow → model load/health → bridge/worker admission. Supervision ordering is not a substitute for readiness retries.
- Provision encrypted off-device backups, verify restore, and keep recovery secrets separately accessible. Back up relay identity/signing keys, config, relational data, media/git volumes, app data and MLflow metadata/artifacts with consistent versions. A copied live database directory is not a validated backup.
- Put GB10 and essential router/switch equipment on a supported UPS sized from measured wall load and required shutdown time. Confirm safe thermal/electrical placement. Document recovery after AC return and any full-disk-encryption unlock requirement; do not assume an unattended boot can unlock encrypted disks.
- Monitor a heartbeat from outside the building. The powered-off machine cannot announce its own outage. The Netlify page should show separate app, chat and AI availability.

## During an outage

| Event | Intended behavior |
|---|---|
| Brief brownout within UPS budget | Continue only while capacity is safe; mark incident and monitor battery |
| Battery below safe shutdown threshold | Stop accepting new inference; allow a bounded drain; persist statuses; stop bridge/model/relay and databases cleanly; then shut down host |
| Sudden loss without drain | Hosted app preserves committed manual work. Local relay/AI disappear. Treat running jobs as uncertain until reconciliation; do not report success merely because a client timed out |
| Internet failure with power present | Keep local data durable; expose degraded status through independent checks; reconnect with deduplication |
| Telemetry/report gap | Mark missing coverage; never convert missing samples into zero activity |

Use a supported UPS integration such as [Network UPS Tools](https://networkupstools.org/docs/user-manual.chunked/) after confirming the UPS model/driver. Thresholds and drain duration must be measured against battery runtime. No universal runtime promise is made.

## Restore service after power returns

1. Check power stability, UPS state, storage health, available disk, system clock and network. Preserve incident logs. Do not immediately erase or rebuild databases.
2. Allow database crash recovery; inspect relay/application health and schema version. If corruption is suspected, restore into a separate recovery instance and verify it before switching traffic.
3. Restore the same relay signing identity and secret configuration. Rotating identities accidentally can break trust and membership expectations.
4. Start the model with the pinned checkpoint and verify readiness with a harmless bounded request. Confirm telemetry and MLflow connectivity; evidence failure must be visible, not silently dropped.
5. Reconcile durable jobs: queued jobs resume within quota; completed jobs retain their result; expired running leases become interrupted/uncertain. Explicit retries receive a new attempt ID. A stable event/task idempotency key and transactional result outbox prevent duplicate canonical writes/replies.
6. Reconnect Buzz subscriptions and compare event history/cursors. The harness documents recovery limitations; do not assume exactly-once delivery. Reauthorize pending jobs against current membership.
7. Verify one owner and one member can access only the right material; check a source/brief, media and one inference trace. Reopen admission gradually and update the incident record.
8. Generate overdue private reports for each missing calendar day, with missing-data annotations. Record restoration time and reconcile count differences.

Current worker behavior already marks expired running leases interrupted; it does not yet provide the full idempotency/outbox and cross-service reconciliation described above. [Buzz ACP recovery](https://github.com/block/buzz/blob/4cd82f513214aad11c2b742ce7cc7c681e8e32a0/crates/buzz-acp/README.md).

## Recovery objectives to validate

Proposed starting targets: off-device backup recovery point ≤24 hours for the local Buzz stack, recovery time ≤2 hours after power/network/operator access are restored. Hosted app recovery targets depend on the selected database plan. These are planning objectives, not measured guarantees; choose tighter backup intervals if a day of conversation loss is unacceptable.

Rehearse process restart first, then an isolated backup restoration, then a scheduled host restart. A UPS/power-cut rehearsal comes only after backups and clean-shutdown behavior pass and participants know the maintenance window. Record RPO/RTO actually achieved, data count/hash comparisons, duplicate-effect tests and unresolved faults. Do not interrupt unrelated GPU work to test recovery.

## Eight-node change later

Give each node a stable ID, independent health/admission and pinned deployment. Stagger upgrades and keep capacity for failure. Separate rack/UPS/circuit/network failure domains where feasible; eight nodes behind one router and power circuit remain one site-level risk. Model replicas do not make the relay, database or report store highly available.
