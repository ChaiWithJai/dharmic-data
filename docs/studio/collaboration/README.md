# Dharmic Studio collaboration planning

Date: 2026-09-13. Author: Astra, acting in the architecture role explicitly requested by Jai. Status: **proposed architecture; collaboration implementation and production readiness are not established by these documents**.

The accepted local Studio is the baseline. This package describes a separate fork for grant writers and collaborators to collect unfinished thoughts, work with sources, imagine together, and record what they have actually agreed to. It does not modify the running app or authorize migration of its private data.

Start with the [product brief](PRODUCT-BRIEF.md), then the [pilot acceptance plan](PILOT-ACCEPTANCE.md). The decisions below are proposals for the fork; implementation receipts must establish which ones were completed.

| ADR | Decision |
|---|---|
| [001](adrs/001-preserve-baseline-and-stage-the-fork.md) | Preserve the accepted local release; build the collaborative fork in stages |
| [002](adrs/002-preserve-human-authorship-and-source-evidence.md) | Separate source evidence, human authorship, and model suggestions |
| [003](adrs/003-workspace-identity-and-permissions.md) | Authenticate people and enforce workspace owner/editor/viewer permissions |
| [004](adrs/004-canonical-brief-and-version-specific-approval.md) | Approve exact canonical versions; retain disagreement and invalidate stale approval |
| [005](adrs/005-shared-canvas-and-license-boundary.md) | Distinguish asynchronous board editing from real-time synchronization |
| [006](adrs/006-durable-data-jobs-and-postgresql-migration.md) | Use durable jobs and a defined PostgreSQL migration path |
| [007](adrs/007-mlflow-learning-and-human-decisions.md) | Keep MLflow evidence attributable and separate from collaboration agreement |

## Evidence boundary

The root agent relayed that Jai explicitly liked the accepted app and requested GitHub preservation followed by a collaboration fork. This is a paraphrase of user feedback in the 2026-09-13 conversation, not an invented testimonial. It establishes owner preference for the experienced local interface. It does not establish collaborator demand, successful grant applications, payment intent, or production reliability.

The earlier browser receipts establish specific local behaviors: source-card CRUD, real tldraw editing, persistence, export/restore, and recovery of one existing Bonsai request. They do not establish account isolation, simultaneous editing, or authenticated approvals. The distinction matters: useful single-user behavior is the starting asset, and collaboration is the next thing to test.

Principal local sources inspected:

| Source | SHA256 at this review |
|---|---|
| `dharmic-data/local-workloads/studio-web/README.md` | `434047fb191f4286e86ae68601dadb1970c93078ad1c016e1add9c32123542d1` |
| `studio-web/verification/real-result.json` under that directory | `4b708a73ae1753fdd49729e16233643815a18334a10617677786f6d97e2b8a8f` |
| `studio-web/verification/live-continuity.json` under that directory | `d84e6a3989226f6a710cbba9f475a3a64f7415e33fe9a3423d408cbd47a40c98` |
| `dharmic-data/docs/messaging-architecture.md` | `d60e6d7d38166de3b8b59c5b1a54d9de968f37c73dc6d1da16d72d931f7fa66f` |

The preserved baseline is now [commit e7827fb](https://github.com/ChaiWithJai/dharmic-data/commit/e7827fbcc9dad84f1d401043953a7c59402cba1e), associated with `studio/personal-v1`. Its [source README](https://github.com/ChaiWithJai/dharmic-data/blob/e7827fbcc9dad84f1d401043953a7c59402cba1e/local-workloads/studio-web/README.md) records the accepted local behavior. Private browser receipts remain local unless explicitly included in a sanitized publication package. The collaboration worktree is separate, on branch `studio/imagine-together`; that branch name is not an immutable release.

Official references were opened on 2026-09-13 and are cited beside the decisions they inform. Proposed product contracts and acceptance thresholds are our design choices, not claims made by those projects.
