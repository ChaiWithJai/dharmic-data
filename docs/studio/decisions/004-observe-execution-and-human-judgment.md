# ADR 004 — Separate execution evidence from usefulness

Status: implemented in the accepted personal edition. Date: September 13, 2026.

The rejected grant passed structural checks. That exposed the weakness of measuring only output shape. A successful model call cannot stand in for the person's judgment.

We followed the installed MLflow skills and canonical tracing, version tracking and feedback APIs. A suggestion records source snapshots, application source hash, model/runtime settings, response, usage and a nested model-call trace. Explicit usefulness feedback is attributed separately from CODE checks. Product-level acceptance is also separate from approval of any one model response.

Two actual Bonsai requests exercised the new path: an API request completed in about 8.3 seconds with 68 completion tokens; a later browser-triggered request completed in about 1.9 seconds with 26 completion tokens and a warm cache. Different prompts and cache state make these operational observations, not a throughput comparison.

We did not claim a verified base-model comparison, train weights, or treat positive product feedback as consent to train on private notes. Future model experiments should use reviewed real requests with frozen sources and held-out cases.

References: [MLflow version tracking](https://mlflow.org/docs/latest/genai/version-tracking/), [feedback](https://mlflow.org/docs/latest/genai/assessments/feedback/).
