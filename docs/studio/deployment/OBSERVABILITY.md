# Private daily report and attributable GPU usage

Status: reporting contract ready for implementation. **No collector or scheduled report is installed by this plan.** The report should help Jai improve service, capacity and teaching; it should not turn private thoughts into a leaderboard.

## Three records, three questions

1. **Application job ledger:** who requested what class of operation, in which authorized scope, with which outcome? This is the source for per-member usage.
2. **MLflow traces/evaluation:** which model/application/source-selection version ran, which steps failed, and did the person find the result useful? It is not the job scheduler or membership authority.
3. **Device telemetry:** how busy, hot, memory-constrained or unavailable was the GB10? This is not sufficient to identify a person.

Buzz relay traffic is mostly application/network/storage work; its connected agents cause model requests. Keep `origin=imagine_together|buzz|operator_test|other` and `purpose=learner_request|heartbeat|retry|evaluation` separate. Other local GPU applications must remain an explicitly unallocated/other category, not be charged to Buzz members.

## Minimal event contract

Every accepted job has server-derived fields:

```json
{
  "event_version": 1,
  "request_id": "opaque-id",
  "job_id": "opaque-id",
  "attempt_id": "opaque-id",
  "idempotency_key_hash": "hash-of-community-event-operation",
  "origin": "buzz",
  "requester_id": "verified-internal-user-id",
  "agent_identity_id": "separate-bot-id",
  "community_id": "opaque-id",
  "workspace_id": "opaque-id",
  "room_id": "opaque-id",
  "buzz_event_id": "signed-event-id-or-null",
  "operation": "draft_alignment_question",
  "queued_at": "UTC timestamp",
  "started_at": "UTC timestamp-or-null",
  "completed_at": "UTC timestamp-or-null",
  "state": "queued|running|succeeded|failed|canceled|interrupted",
  "node_id": "stable-node-id-or-null",
  "checkpoint_sha256": "verified-file-hash-or-null",
  "application_version": "git-commit",
  "prompt_tokens": null,
  "completion_tokens": null,
  "usage_source": "provider|estimated|unavailable",
  "trace_id": null,
  "error_code": null,
  "human_feedback": "pending"
}
```

Never accept requester identity from the model or a caller-supplied display name. Map the signed Buzz identity to a verified beta account; preserve the requesting person separately from the bot. Scheduled jobs have a service principal and schedule owner; distinguish that from a live human request. Record retries individually and aggregate both logical jobs and attempts to avoid hiding costs. Cancellation must be acknowledged by the actual worker before being counted as canceled compute.

## Metrics and attribution limits

| Metric | Source | Interpretation |
|---|---|---|
| Jobs/attempts by person, room and operation | Authenticated ledger | Exact within ingested/reconciled scope; names resolved only in the private report |
| Queue, inference, end-to-end p50/p95 | Job timestamps and trace spans | Separate network/queue/model delay; report sample count and small-sample limits |
| Prompt/output tokens | Provider response | Missing remains null; estimates labeled; sum retries separately |
| Human-kept/rejected suggestion and reason | Explicit feedback | Feedback coverage shown; pending is neither approval nor rejection |
| GPU utilization, temperature, supported power | NVML or capability-tested collector | Device-wide samples; no per-person attribution from utilization alone |
| Host memory, swap, load, disk and service state | Host/cgroup metrics | Unified memory requires host visibility; process accounting may not capture every driver allocation |
| GPU energy estimate | Integral of supported power samples over time | GPU sensor scope is not whole-machine electricity; gaps are excluded/reported |
| Whole-site energy/cost | External wall/UPS meter and tariff | Include idle, router, cooling and overhead; validate meter scope |
| Per-job allocated energy | Explicit allocation method, if needed | An estimate under shared/batched execution, not measured personal GPU usage |

Observed in one read-only GB10 probe: utilization and power were available; `memory.used` returned N/A. Do not fill that field with zero or promise a standard VRAM dashboard. Capability-test NVML on the installed driver; DCGM metrics/support must also be verified on this hardware. Use host memory and model-server counters alongside supported GPU fields. [NVIDIA-SMI/NVML guidance](https://docs.nvidia.com/deploy/nvidia-smi/index.html), [DCGM features](https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/feature-overview.html).

Start with 15-second resource sampling, durable local spool and bounded retention; measure collector overhead. An independent service records heartbeat loss. Store monotonic durations plus UTC event timestamps; attach node boot ID to avoid joining unrelated processes after restart. Label sensor capability/version and collection gaps.

Suggested tool boundary: NVML/host exporter → private time-series store/dashboard; job ledger → deterministic daily aggregation; MLflow → trace and evaluation drill-down. A large monitoring stack is optional for the first node. Keep raw user IDs out of high-cardinality public metrics labels; the restricted ledger performs the identity join.

## Privacy changes required before beta

The current worker logs complete source cards and raw model responses in MLflow artifacts and trace inputs. That behavior is useful in Jai's personal lab but must change before promising beta privacy. Default beta reports and traces should contain operational metadata; content tracing requires a clear policy and explicit permission for the relevant workspace/use. Redact or disable framework autologged content too—removing only the manual artifact is insufficient.

Report access: Jai and explicitly assigned operators. No shared channel post, public Netlify asset, GitHub artifact or public MLflow endpoint. A private room alone is insufficient if its export, media URL or backing metrics are public. Use an owner-only report endpoint or restricted storage; authorize each download. Explain to members that operators can see identity and service usage, with access logs and a retention/deletion process. Never market the system as end-to-end encrypted.

Proposed retention: raw operational events/samples 30 days, daily aggregates 90 days; content traces disabled by default. Review this with the beta privacy notice. Account deletion should remove identity mappings where appropriate and purge content/trace copies according to the published policy. Training permission is separate and absent by default.

## Daily report at 08:00 America/New_York

Cover the previous **local calendar day**, compute exact UTC boundaries with timezone rules, and tolerate 23/25-hour DST days. Use one report key per date/version and atomic writes. A persistent scheduler catches up after downtime, but the report program must enumerate all missing dates: one catch-up timer activation is not one activation per missed day. Local systemd is suitable initially; an off-device scheduler/heartbeat is required to report an ongoing complete host outage.

The first delivery is an owner-only dashboard/report artifact, not email. Notifications can later link to that authenticated report without including private content. No automated send is configured.

Daily sections:

- **Coverage:** time window, online minutes, expected/received samples, missing intervals, last successful backup, report version.
- **People and demand:** unique verified users, logical jobs and attempts by person/room/operation, denied/quota-limited requests, scheduled work separately.
- **Experience:** success/failure/cancellation/interruption counts, p50/p95 waits, tokens, feedback coverage, unsupported-claim reports and correction reasons.
- **Device:** utilization distribution, supported power/temperature, host memory/swap, saturation/throttling if supported, other-workload contention and unknown attribution.
- **Learning:** completed review milestones and opt-in community shares; Maven clicks as clicks, not enrollment. Never infer alignment from model output or count private content as shared.
- **Actions:** top evidenced issue, affected jobs, likely layer (interface/authorization/queue/model/tools), proposed next experiment, and what would justify another replica.

Example empty-report language: “No complete telemetry coverage is available for this interval. Usage is unknown.” Never generate a synthetic successful day. Recommendations can be drafted by Bonsai from aggregated non-content data later, but computed numbers come from deterministic queries with provenance, not the language model.

## Acceptance checks

Submit known jobs from two verified users plus a scheduled principal; reconcile totals across ledger/MLflow/report. Include retry, provider failure, missing usage, unauthorized room, concurrent jobs and another GPU process. Confirm attribution remains correct and GPU energy is not represented as an exact per-user measurement. Simulate report interruption, duplicate scheduling, DST and multiple missed days. Verify a non-owner cannot download the report and that no source text, secret or raw prompt appears in metadata-only traces. Log the tests as verification, not HUMAN product acceptance.
