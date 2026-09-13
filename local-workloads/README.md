# Dharmic Swipe Studio — Jai’s accepted personal edition

**Capture your unfinished thoughts.** This branch preserves the local app Jai accepted on September 13, 2026: a source library and editable canvas, with optional Bonsai assistance and MLflow traces.

This is a preserved development edition for Jai’s GB10, not a hosted collaboration service. The accepted source files are pinned in `preserved-source-manifest.json`. His running app and private workspace remain on his machine. This source publication does not include personal notes, raw inference transcripts, private model weights, application drafts or downloaded third-party HTML.

- [Run and use the local app](studio/README.md)
- [Success criteria and the corrected experiment](studio/SUCCESS-v2.md)
- [Why this app exists and what Jai approved](../docs/studio/PRODUCT-MEMORY.md)
- [Decision records](../docs/studio/decisions/README.md)
- [Thirty grant recipients](research/recipient-study.md)

The first generated grant and lecture artifacts missed the job. The useful artifact was a place for the person to gather sources, arrange ideas and choose what to keep. Jai explicitly recognized this version as helpful and aligned. That is product feedback, not proof that Bonsai outperforms another model.

The next edition branches from this preserved version for grant writers and collaborators to **imagine together**, develop a shared canonical brief, record disagreements and decisions, and find Jai’s learning sessions on [Maven](https://maven.com/a-plus). The collaboration edition must earn its own acceptance; it must not overwrite this personal workspace.

## Dependencies and licensing

Python dependencies are declared and locked here; React/Vite/tldraw dependencies are locked in `studio-web/package-lock.json`. The existing service examples retain Jai’s machine paths for reproducibility. Inference also depends on his separately installed qualified Bonsai server and MLflow service.

The tldraw SDK is used with its attribution in local development mode. Publishing this application's source does not grant a tldraw production license or redistribute private model weights. See [tldraw licensing](https://tldraw.dev/community/license). No new license is asserted for third-party dependencies.
