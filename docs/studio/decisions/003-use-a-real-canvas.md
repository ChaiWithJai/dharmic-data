# ADR 003 — Use and test a real editable canvas

Status: implemented in the accepted personal edition. Date: September 13, 2026.

A static page did not satisfy the request. We chose React/Vite with the tldraw SDK so the user can arrange, connect, draw, zoom and edit material.

The API saves tldraw document snapshots with compare-and-set revisions. Fonts and other SDK assets are installed locally. Browser verification caught a blank-screen bug caused by dependency optimization of asset imports; excluding the assets package from prebundling fixed it. Verification also distinguished duplicated measurement DOM from an actual text-editing failure.

The final tests covered create, drag, text edit, reload, source preservation and backup restore. The keyboard-accessible card list remains a path for reading and editing source material. This is not a claim of full accessibility certification.

This snapshot design is asynchronous. It detects conflicting saves but does not merge simultaneous canvas edits. The collaboration edition needs a separately qualified sync service if it promises real-time multiplayer editing. Production distribution also requires the appropriate tldraw license; local development attribution remains intact.

References: [persistence](https://tldraw.dev/docs/persistence), [sync](https://tldraw.dev/docs/sync), [licensing](https://tldraw.dev/community/license).
