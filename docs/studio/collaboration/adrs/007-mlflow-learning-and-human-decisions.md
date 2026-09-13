# ADR 007 — MLflow learning and human decisions

Status: proposed. Date: 2026-09-13.

## Context

The accepted app already links a real Bonsai suggestion to MLflow and offers explicit usefulness feedback. Collaboration adds authenticated authors and canonical approvals. Those signals have different meanings and must not collapse into one score.

## Decision

Keep three records separate:

1. **Application execution:** what code, model, input versions, and tools produced a result; whether it completed within budget.
2. **Human usefulness feedback:** what a person found useful, rejected, or corrected in that result.
3. **Team decision/approval:** what named collaborators accepted as the project's canonical position.

Native MLflow traces and application versions capture execution. Human feedback attaches to the result trace and preserves the authenticated application actor's attribution; automated tests and model-assisted review keep their own source types. Canonical approvals remain authoritative application records, linked into evidence only as explicit events. Clicking “Useful” cannot approve a grant claim or create unanimous agreement.

Use native evaluation datasets for permissioned regression cases, with expected behavior kept out of model-visible inputs. Track the full deployed application identity alongside the weight/runtime manifest. A failure can become an intervention: source retrieval, instruction wording, output handling, runtime settings, or later model work. MLflow's documented workflow connects tracing, expectations, datasets, evaluation, and iteration. [Evaluation-driven development](https://mlflow.org/docs/latest/genai/datasets/end-to-end-workflow/)

For cross-workspace confidentiality, initially keep MLflow operator-only on the local machine and expose scoped result evidence through the application. Production direct dashboard access requires matching access controls, such as separate authorized workspace experiments plus separately qualified model/prompt registry visibility, or separate stores where needed. An experiment tag alone is not an access boundary. MLflow's self-hosting documentation provides authentication and resource permissions; the deployment must verify its actual version and behavior. [MLflow authentication](https://mlflow.org/docs/latest/self-hosting/security/basic-http-auth/)

The application authorizes every trace/result/export link it exposes. Do not reveal another workspace's prompt, attachment, or assessment through an otherwise harmless-looking job ID. Team users need not receive raw database or unrestricted tracking-server access to review a suggestion.

## What the dashboard should explain

Show the workspace's experiment question, tested application/model versions, input provenance, completed/interrupted coverage, actual human review, recurring corrections, and the next intervention. Keep accepted drafting, approval, actual use, and grant outcomes separate. A human-edited text can be useful even when its original model output failed a criterion.

For collaboration, observe whether a person found a prior source, understood why a decision changed, recovered a conflict, or noticed that approval became stale. Do not infer social agreement or personal qualities from language-model sentiment analysis.

MLflow review queues can structure result review, but their default unauthenticated identity is not named team identity. Configure and verify attribution before describing reviews as authenticated. [Review queues](https://mlflow.org/docs/latest/genai/assessments/review-queues/)

## Verification

One real requested suggestion yields linked execution evidence and remains unapplied. A person marks it useful or not useful; the trace records their actual action. A separate canonical approval records its exact version. Confirm neither action creates the other. A model-disabled session can still author, review, decide, and export. A tracking-server outage queues evidence publication without repeating inference. A workspace outsider cannot read the trace or its artifact through either application or permitted dashboard paths.
