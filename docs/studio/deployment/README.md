# Imagine Together beta deployment plan

Prepared 2026-09-13 for Jai. **Plan ready for implementation; no Netlify deployment, DNS connection, Buzz installation, telemetry collector or daily-report timer was activated by this work.**

The product: a Dharmic Data learning community where people capture unfinished thoughts privately, invite one collaborator, create rooms around shared interests, and choose what to share. A repeatable review process helps them reach explicit alignment. Optional Maven workshops deepen the practice without blocking private work or export.

Start here:

1. [Product, permissions and Netlify architecture](BETA-PLAN.md)
2. [GB10/Buzz startup, backup and power-loss runbook](OPERATIONS.md)
3. [Usage attribution and private daily report](OBSERVABILITY.md)

The existing personal app is preserved. This plan extends the Imagine Together collaboration branch. The current app already has named local accounts, workspace roles, sources, canvas snapshots, exact-version reviews and tracked inference. It does not yet implement beta enrollment, one-guest entitlements, community publication, interest-room discovery, shared Buzz identity, public hosting or the reports described here.

## Delivery gates

| Stage | Concrete delivery | Acceptance before proceeding |
|---|---|---|
| 0. Contract | Confirm the proposed one-guest and sharing rules below; choose beta auth and application hosting | Jai can explain who can see an item before and after every sharing action |
| 1. Netlify preview | Separate site/preview using synthetic data, brand and complete navigation | Build/refresh routes work; no production secrets or private data; existing site pipeline unchanged |
| 2. Private beta foundation | Identity, private projects, guest entitlement, permissions, hosted database and API | Concurrent invite redemption, cross-room isolation, revocation and backup restoration pass |
| 3. Community learning | Explicit share snapshots, interest rooms, exact-revision alignment and optional Maven links | Two real collaborators complete the workflow; private material never appears in shared search or agent context |
| 4. GB10/Buzz integration | Pinned ARM64-qualified relay stack and constrained inference bridge | Named users receive scoped replies, replay does not duplicate effects, all jobs have attribution |
| 5. Operations rehearsal | Boot services, UPS/restore procedures, independent heartbeat, private report | Controlled restart and restore tests pass; report reconciles job counts and labels gaps; owner-only access tested |
| 6. Invited release | Netlify production subdomain with bounded enrollment and inference budget | Low-memory client sessions, accessibility and security checks pass; actual people find it useful |
| Later | Jai optionally connects community.dharmicdata.org | DNS/certificate/identity callback change reviewed and tested; not part of this task |

The implementation can deliver browser beta use before Buzz integration, because the website must not depend on the Buzz desktop app. Eight-node purchasing remains gated by real usage and a two-replica capacity experiment.
