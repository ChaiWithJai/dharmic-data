# ADR 005 — Preserve the accepted app before expanding it

Status: implemented for source preservation; collaboration is a separate pilot. Date: September 13, 2026.

Jai asked to preserve the app, document how it was built and expand it for grant writers and collaborators. His product language is “capture their unfinished thoughts” and “imagine together.”

We published the personal source to the existing GitHub repository on `studio/personal-v1`, with a source manifest and an explicit product-memory record. Private databases, model weights, raw traces and personal grant drafts remain outside the source publication. The original app continues to run on its own ports and database.

The collaboration edition derives from that source on `studio/imagine-together`. It has separate runtime storage and ports. Named accounts, workspace permissions, canonical versions, human reviews and decision history must be tested independently; a useful personal canvas is not evidence of safe multi-user operation.

The first audience is a grant writer and their collaborators. Workshop invitations point to Jai's verified Maven profile, without inventing a specific paid offer or requiring enrollment to use the app. The value proposition to test is less lost context and clearer agreement on a supported project brief—not guaranteed grant wins.
