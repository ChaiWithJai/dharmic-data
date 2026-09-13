# Bounded collaboration pilot and acceptance gates

Status: proposed, not executed by this architecture review. Start with Jai and one collaborator, one real project, two separate authenticated browser sessions, and one returning session. Preserve the accepted single-user installation throughout.

## Gate 0 — Preserve and identify

Record the actual baseline commit, fork location, isolated database/ports, and tested restore procedure. Document which verification artifacts are sanitized for GitHub and which private evidence remains local. A release note must distinguish accepted local behavior from planned collaboration.

## Gate 1 — Two real identities, two workspaces

Provision owner, editor, viewer, and outsider test accounts. Complete the permission matrix in ADR 003, including direct API and asset/job access. Create distinct content in two workspaces and demonstrate isolation through search, card/board reads, export, model input selection, and evidence links. Test revocation and restart. No shared password or client-side role toggle counts as named identity.

## Gate 2 — Preserve the writing experience

Each collaborator captures one actual unfinished thought and one cited source. No application-supplied personal story is presented as theirs. Find the other person's permitted contribution, ask a clarifying question, edit a note, and recover an edit conflict. Complete the same core work through the text/list view with keyboard controls. Record any accessibility barrier; automated checks do not substitute for the participants' actual access needs.

If the pilot uses asynchronous board snapshots, make the handoff visible and test conflict recovery. If it promises simultaneous editing, the independent sync and licensing gate in ADR 005 must pass first.

## Gate 3 — Make alignment inspectable

Write one canonical project brief with at least one explicitly unresolved issue. Designate required reviewers. Approve one exact revision, edit a claim, and demonstrate stale approval. Reapprove the new revision and record an owner decision with its source versions and next action. Show that a request for changes remains visible and that an owner cannot impersonate the collaborator.

Export the last accepted brief with revision, sources, current review status, and unresolved issues. If a newer draft exists, identify it separately. A reviewer returning later should understand what changed without relying on a model's confident summary.

## Gate 4 — One optional model contribution

Ask Bonsai one bounded question using selected authorized material. Preserve originals, show the suggestion and trace, collect an explicit human usefulness/correction action, and verify that applying the suggestion cannot overwrite a newer human revision. Reopen the job after browser and worker restart. Test model unavailability: all manual authoring and canonical review still work.

No automatic model calls, synthetic human approvals, or training run is required to complete this pilot. Corrections may identify a future development case; data permission, reward design, and held-out validation are separate future decisions.

## Gate 5 — Return to the work

In a second session, ask both participants to locate the accepted brief, identify its remaining uncertainty, explain a prior decision, and perform or revise the agreed next action. Record actual observations: preparation/recovery time, missing context, conflicts, corrections, and perceived loss of voice. Do not fill missing observations with estimates.

Proposed pilot completion: both people can perform those tasks, no observed unauthorized access or silent lost edit in the defined tests, version-specific approval behaves correctly, and the exported artifact is one they would actually use. These are feasibility conditions, not statistical reliability or market validation.

## What triggers the next stage

| Observation | Next action |
|---|---|
| People use the brief and return to the ledger | Try a second independent pair/project |
| Writing feels constrained or overly polished | Simplify capture and prompts; preserve blank space and human phrasing |
| People cannot tell what was accepted | Fix canonical status/revision UI before adding features |
| Snapshot handoff obstructs real work | Qualify licensed real-time room synchronization |
| A recurring model failure has adequate source evidence | Freeze a development counterexample and change one intervention |
| Data isolation or approval attribution fails | Keep the fork local and correct that boundary before inviting others |
| A second pair has a recurring problem and wants continued use | Investigate operating/support cost and willingness to pay |

The final pilot receipt should name the tested commit, identities used in tests, workspace/version IDs, results and exclusions, actual participant feedback, unresolved defects, and the one next decision. Link it from the fork's decision ledger and MLflow planning/evaluation record without claiming this planning document itself is an executed result.
