# Imagine Together — grant collaboration pilot

Capture unfinished thoughts, work from sources, and create a brief your collaborators can explicitly agree to. This edition is separate from Jai's accepted personal Studio.

## Run locally

From a clone of the `studio/imagine-together` branch, install [uv](https://docs.astral.sh/uv/getting-started/installation/) and a supported Node version (22.12 or later), then:

```sh
cd local-workloads/team-studio
uv sync --locked
uv run uvicorn api:app --host 127.0.0.1 --port 8791
```

In a second terminal in that directory:

```sh
uv run python worker.py
```

In a third terminal:

```sh
cd local-workloads/studio-web
npm ci
npm run dev
```

Open http://127.0.0.1:8790. Create a named account using a password of at least 12 characters. Create a workspace, then create a single-use editor or viewer invitation. A collaborator creates their own account in a separate browser profile and redeems that invitation. This pilot is local to the machine; the invitation is not a publicly hosted URL or an email send.

The manual workspace works without Bonsai or MLflow. Model requests remain queued until the separate worker is running. The default worker expects an OpenAI-compatible Bonsai endpoint on http://127.0.0.1:8001/v1 and local MLflow on http://127.0.0.1:5001. Set variables from `.env.example` explicitly in your shell; the file itself is a template, not automatically loaded. Keep credentials out of Git.

## Shared work and canonical agreement

Owners and editors can create source cards and edit the shared canvas. Viewers can read and export. Source passages remain distinct from team notes. Canvas copies retain source IDs/revisions and do not silently rewrite library sources.

This is asynchronous collaboration. Reload to see another person's latest work; competing saves produce a visible conflict. It does not merge simultaneous canvas edits.

The Alignment view holds a Markdown brief, selected source cards and required reviewers. The owner chooses reviewers; editors can revise the brief. Each required person approves or requests changes on the exact revision. A changed brief, dependency or reviewer membership invalidates the old review. An owner can publish only a fully approved current version. Historical versions and reviews remain in the database; an AI suggestion cannot approve anything.

Use the decision ledger to record the decision and why, with sources. A saved decision records its author's choice; it is not an automatic claim of unanimous agreement.

## Evidence and feedback

AI requests snapshot selected authorized sources and enter a durable database queue. A worker claims a job, generates a suggestion without modifying any document, and records the run/trace in MLflow. The app exposes a scoped evidence download rather than an unrestricted dashboard URL. MLflow remains an operator tool.

Applying a suggestion checks its source revision, preserves the quotation and records the originating job. Useful / Not useful is separate from canonical approval. Automated tests never submit synthetic HUMAN feedback to a real MLflow trace. No model training is performed.

## Data and recovery

The default database is `data/team.sqlite3`, separate from the personal app. Set `DATABASE_URL` for PostgreSQL; the same API tests can run against an isolated PostgreSQL test database. Current schema creation is the pilot's initial schema, not a production migration system.

Export includes sources, canvas, current brief and decisions. Restore is owner-only and writes the old content to the workspace audit trail first. Imported sources receive new workspace-local IDs, canvas source references are remapped, and prior approvals/membership are not imported. Required reviewers reset to the restoring owner and must be chosen again. Restoring a backup is not equivalent to a full database disaster-recovery operation.

## Verify

```sh
uv run python test_team.py
# Only against a disposable test database:
STUDIO_TEST_DATABASE_URL=postgresql+psycopg://USER:PASSWORD@127.0.0.1:5439/testdb uv run python test_team.py
```

The API suite exercises named-account isolation, viewer restrictions, cross-workspace access, source/brief approval staleness, membership revocation, concurrent canvas saves, restore behavior, durable claims and AI-edit provenance. Browser evidence is recorded separately. Real participant usefulness is still pending.

See [production gates](../../../docs/studio/PRODUCTION-GATES.md) from the repository root at `docs/studio/PRODUCTION-GATES.md`, [architecture decisions](../../../docs/studio/collaboration/README.md) and [product memory](../../../docs/studio/PRODUCT-MEMORY.md). Local development use retains tldraw attribution; a public production release requires the appropriate license and the deployment gates.
