# Dharmic Swipe Studio

Open **Dharmic Swipe Studio** from the machine’s application menu, or visit http://127.0.0.1:8780. This is Jai’s single-user local development app: a source library beside a real tldraw canvas.

Capture an original passage, its source and your own note separately. Add a card to the canvas when you want to work with it; arrange, draw, connect and edit there. A canvas card is an editable copy, so changing it does not silently rewrite the source library. Use Courage, Passion and Creative Imagination as collections. The grant examples are a separate research collection with source links and explicitly attributed summaries.

Select source cards and open **Ask Bonsai** for an optional suggestion. The response is displayed separately. You can append it to a note, discard it, or record Useful / Not useful with a reason. Appending preserves the source quotation. AI requests snapshot the selected card revisions; applying a suggestion to a changed card is rejected to avoid overwriting newer work.

The app is useful without inference. It does not record the screen, microphone or other applications. You deliberately capture material. Images and shapes can be placed on the tldraw canvas; large image collections may reach the 15 MB workspace request limit. No cloud synchronization or public sharing is configured.

## Start and stop

The installed desktop launcher starts these user services and opens the browser:

```sh
systemctl --user start dharmic-studio-api dharmic-studio-web
systemctl --user stop dharmic-studio-api dharmic-studio-web
journalctl --user -u dharmic-studio-api -u dharmic-studio-web -n 50
```

They are installed for this machine and are not enabled automatically at login. Launching the app starts them again. Configuration examples and `launch.sh` are next to this file. The frontend binds 127.0.0.1:8780; the API binds 127.0.0.1:8781. Bonsai must already be serving its qualified checkpoint on port 8001 and MLflow must be running on port 5001 for AI requests. The launcher does not load a GPU model or restart unrelated services.

This installation uses the existing `ale/experiments/gb10/.tracking-venv` Python environment. Dependencies are declared in `../pyproject.toml` and locked in `../uv.lock`; frontend dependencies are locked in `../studio-web/package-lock.json`. To recreate development dependencies, use `uv sync --locked` in `local-workloads` and `npm ci` in `studio-web`, then adjust the service's Python path to that environment.

## Where the work lives

| Record | Location and purpose |
|---|---|
| Cards, saved canvas, AI job records | `studio/data/studio.sqlite3`; durable local SQLite with WAL |
| Before-restore backups | `studio/data/before-import-*.json` |
| Portable workspace | **Export backup** downloads cards and canvas together |
| AI evidence | MLflow `my-experiment`, project tag `dharmic-swipe-studio` |
| Recipient study and revised grant | `../research/recipient-study.md` and `grant-proposal-v2.md` |

Restore replaces the current workspace after validation and preserves a backup first. Adding the research examples merges them without replacing personal cards or the board. Stale card and canvas revisions produce a visible conflict rather than silently winning. Do not treat a single local disk as a disaster backup: use Export backup to keep a second copy where you choose.

## Reading MLflow

Each suggestion has a link to its run. The run records the app source hash, served model path/properties, previously verified checkpoint SHA, generation settings, frozen source cards and raw response. The trace contains the editorial request and nested OpenAI-compatible local inference span, including model usage. App version tracking uses MLflow LoggedModel.

**PENDING** means the model completed and the output awaits a human judgment. **USEFUL** or **NOT_USEFUL** comes only from the explicit local-app feedback buttons. Local feedback is attributed to `local-workspace-user`; this single-user app does not authenticate an identity. Automatic verification results use CODE attribution. Earlier rejected grant/lecture drafts remain preserved and marked REJECTED. Technical completion is not a quality score.

The active Bonsai file is `latest-27B-PQ2_0.gguf`, previously hashed as `693230b006b54da569ff9f1a81d0cfb80a2c85216f62628217fcc587d2e28ab4`. The server path is checked on each request. Its claimed Qwen3.8 parent has not been independently verified, so this is not a base-model comparison or a compression-retention result. A different model needs a separately qualified manifest before being substituted.

## What this first working app tests

1. Can Jai capture and reopen material he actually wants to use?
2. Can he arrange it while preserving the original source and his own interpretation?
3. Does an optional model suggestion help him decide what to teach, and can he explain why?

The first two are software acceptance tests. The third is Jai’s judgment during lecture preparation. It is not established by a green trace, and no reinforcement learning has been run. The next model experiment should use saved, reviewed requests and corrections from real preparation, with fixed source packets and matched generation settings.

## Verification and boundaries

Backend tests cover persistence, revision conflicts, atomic invalid-restore rejection, pre-restore backups, and rejection of unrelated website mutations. Browser tests exercise the real tldraw interaction and API contract; the verification receipt records which tests used fixtures, the actual SQLite API, or the real Bonsai service.

The tldraw SDK is used in its permitted local development mode with attribution intact. A production distribution needs the appropriate license; this is not a claim of a commercial production license. See [tldraw licensing](https://tldraw.dev/community/license) and [persistence](https://tldraw.dev/sdk-features/persistence).

MLflow integration follows [version tracking](https://mlflow.org/docs/latest/genai/version-tracking/) and [feedback collection](https://mlflow.org/docs/latest/genai/assessments/feedback/). The installed `mlflow skills list` guidance was read before instrumentation. Manual authoring remains independent of MLflow; an unavailable tracker makes an AI job fail visibly without changing your cards.
