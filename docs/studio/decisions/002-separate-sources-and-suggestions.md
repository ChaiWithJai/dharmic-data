# ADR 002 — Preserve the source and the author’s choice

Status: implemented in the accepted personal edition. Date: September 13, 2026.

A source quotation, the author's interpretation and a model's proposed wording have different meanings. Mixing them makes a fluent output look more trustworthy than its evidence and can erase the person's voice.

Cards therefore store original passage, source locator and note separately. Adding a card to the canvas creates an editable copy with the original card ID/revision. Canvas editing does not rewrite the library. Bonsai receives selected card snapshots; appending a suggestion requires an explicit action and the captured card revision.

We use SQLite with optimistic revisions rather than browser memory as the authority. A stale write is rejected visibly. Backup restore preserves a pre-restore copy and advances revisions; it must not let an old suggestion overwrite restored work. Later changes added job recovery so a useful suggestion remains available after reload.

The cost is deliberate conflict handling and two representations of a source. The benefit is preserving evidence while allowing free thought. Tests exercised actual storage and real browser interactions; they do not certify every accessibility need or every possible failure.
