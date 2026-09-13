# ADR 002 — Preserve human authorship and source evidence

Status: proposed. Date: 2026-09-13.

## Context

The useful local Studio lets a person keep unfinished thoughts and choose what to do with model suggestions. The collaborative version must preserve that control while making another author's contributions legible. A polished generated paragraph is not evidence of a person's experience or of collective agreement.

## Decision

Represent the following separately:

| Record | Meaning |
|---|---|
| Source snapshot and locator | What an external source actually said, at a recorded time/version |
| Human note revision | What an identified person wrote or explicitly edited |
| AI suggestion | A generated proposal tied to selected source/note versions and a trace |
| Accepted edit | A person's explicit application of a suggestion, preserving its origin |
| Canonical brief revision | A proposed or accepted statement of the project's current position |

Use `created_by`, `updated_by`, `origin_type`, `derived_from`, `workspace_id`, revision ID, and content hash. Human-created notes remain distinct from imported assistant research. A model may propose text but cannot directly modify a source quote, fabricate an author, add an approval, or write a human decision into the ledger.

Keep quotes and paraphrases in separate fields. Source corrections create revisions; they do not overwrite the evidence used by an earlier model request. An editable canvas copy retains its source-card ID and originating revision. Editing that copy does not mutate the library source. Promoting board text into the canonical brief is explicit.

AI suggestions use the source versions selected at request time. Applying one requires unchanged destination revisions or a visible human reconciliation. A restored backup does not recycle revision identifiers in a way that lets an old suggestion overwrite newly changed content. Use unique revision IDs or monotonic revision generations across restore/import.

For the first pilot, a workspace is the shared unit. Do not offer “private within this workspace” cards until every search, board, export, suggestion, and trace path implements that finer access scope. Authors can keep private material in their personal workspace and explicitly copy selected material into the shared one.

## Consequences

The system stores more provenance than an ordinary scratchpad, but the writing interface stays simple: source, my note, suggestion. Attribution is visible when needed, not an obstacle before every keystroke. Model-generated examples are marked as examples rather than presented as a contributor's life story.

## Verification

Create one source, two different human notes, and one model suggestion. Confirm that authorship and origin survive edit, export, and restore; applying a suggestion leaves the quote intact; stale application is rejected; and another person's account cannot forge the first person's author field. A rejected suggestion remains a generated suggestion, not a human-approved passage.
