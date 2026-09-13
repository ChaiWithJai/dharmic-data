# ADR 004 — Canonical brief and version-specific approval

Status: proposed. Date: 2026-09-13.

## Context

A collaborative canvas can make people feel aligned without exposing unresolved disagreement. The grant writer needs to know which exact claims, plans, and commitments the team accepted. A thumbs-up on an old message or helpful AI answer cannot answer that question.

## Decision

Each workspace has a canonical project brief and an append-only logical decision history. The brief is edited as drafts and frozen into immutable revisions for review. Each revision records its author, content hash, source/note revision manifest, unresolved questions, and review-policy revision.

The current review target is identified by:

```text
(workspace_id, document_id, document_revision_id,
 content_hash, dependency_manifest_hash, review_policy_revision)
```

An approval records that tuple, the authenticated reviewer, decision (`approve` or `request_changes`), rationale, and time. Default pilot policy requires the owner and the named collaborator to approve. The required reviewer set is explicit; inviting someone does not silently add an approval requirement, and removing a dissenter does not silently complete the old review.

The owner accepts the current canonical revision only when every required, still-authorized reviewer has approved the same target. Record acceptance in the decision ledger. AI has no permission to create approvals, acceptance, or a claim of unanimity. An owner may document a decision taken despite disagreement, but its visible status is “owner decision with unresolved disagreement,” not “team agreed.”

### State rules

- New draft: no current approval.
- Submit for review: freeze the target tuple and required reviewers.
- Request changes: current target is not accepted.
- All required approvals: eligible for the owner's acceptance action.
- Change brief content, referenced current source/note versions, or review policy: current review becomes stale and needs a new review target.
- Edit after acceptance: retain the accepted historical version and show the new current draft as unapproved.
- Restore old content: create a new revision/generation; do not revive historical approvals automatically.

Historic approvals remain evidence of what was approved at the time. They never appear as approval of new content. A canvas remains a working surface; layout changes alone do not change the canonical brief unless the approved artifact explicitly includes that exact board snapshot. Copying a source version into the brief is explicit, and dependency drift is surfaced before further use of its approval.

### Minimum decision record

Record the issue, options considered, accepted action, reason, supporting source versions, acknowledged disagreement, owner, date, next test, and links to the canonical revision and approvals. Corrections append a superseding decision rather than rewriting history. This application history is not a claim of tamper-proof storage; authorized data deletion and retention need their own audited operation.

## Verification

Two reviewers approve revision 3. An editor changes one factual sentence: revision 4 cannot inherit either approval. Repeat with a changed source dependency and changed reviewer policy. Check that an approval sent for a stale version is rejected transactionally, a removed reviewer cannot approve, an owner cannot post another person's identity, and an AI result cannot call the approval route. Export identifies both the last accepted version and any newer unapproved draft.
