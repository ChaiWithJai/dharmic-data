# Handoff and next experiment

## Preserved and delivered

The personal app is preserved at commit `8a9b0a9b14eb6f2466d4e94cee51a910dfd9092c` on `studio/personal-v1`. Its 30-file manifest was checked against the accepted working source. The collaboration derivative is on `studio/imagine-together`.

On Jai's machine, the original app remains at http://127.0.0.1:8780. Imagine Together runs at http://127.0.0.1:8790, with a separate database and desktop launcher. Create an account and workspace to begin. Local invitations support separate browser profiles on the same machine; they do not provide remote hosting.

## Verification on 2026-09-13

- Nine backend tests pass on SQLite and actual PostgreSQL 16, including authorization, revision-bound review, revocation, concurrent writes, restore and source snapshots in exports.
- Ten real-browser collaboration checks pass: separate accounts, invitations, canvas persistence, disagreement, approval/publish, stale source warnings, viewer restrictions and workspace switching.
- Fifteen mocked frontend regression checks pass; TypeScript and the production asset build pass. Mocked inference is not model evidence.
- One real Bonsai suggestion is separately recorded in local MLflow with model request, response, token usage and application version. This checks integration, not usefulness or quantization retention. Run `262520c67f0f40c58a174c115470ee42`, trace `tr-a1a37306a87b3908b15ab457eb01efa5`: two spans, 310 prompt tokens, 17 completion tokens, 2.03 seconds for this one fixture.
- Automated checks do not submit HUMAN usefulness judgments or approve real grant documents. No model training occurred.

PostgreSQL test image digest: `sha256:f1c3376c26f2609ab9f29f71f824103fe2fcd8ee0346485cb6122a4f93df6f94`. Tests use a disposable database; production migration and recovery procedures remain unvalidated.

## First useful pilot

Hypothesis: two grant collaborators can turn their unfinished thoughts into a source-grounded brief that reflects both their intentions, while retaining disagreements and requiring less clarification than their current process.

Choose one real grant opportunity and two willing collaborators. Start from their own notes and the grant's canonical requirements. Keep eligibility and deadlines linked to their sources. Capture disagreements before generating prose. Each person reviews the exact brief revision independently; publication requires the required reviewers' approval.

Record time to a mutually acceptable brief, unsupported claims found, misunderstandings caught, manual corrections, source changes, and each person's explicit explanation of usefulness. The primary outcome is whether both people recognize the document as their intent. A fluent paragraph or passing UI test is insufficient.

Use the same fixed source set and instruction for a later blinded model comparison. Separate application/friction failures from model failures. Verify the Bonsai checkpoint's actual parent before describing results as compression loss. Obtain specific data consent before retaining collaborator material for training; selected feedback is not an RL program by itself.

## Dashboard interpretation

MLflow `my-experiment` at http://127.0.0.1:5001 is an operator dashboard. Filter `project = imagine-together` for this derivative. Inference records carry workspace/job identifiers, application version, model/endpoint configuration, trace, raw output and token/latency metrics. These are execution observations. Human usefulness remains PENDING until the actual user responds. Canonical document approval is stored separately in the app and is not a model quality score.

The original app's explicit acceptance is recorded in run `7683ea4b59ca45df93bc0e3945985a2f`; it does not establish acceptance of this new collaboration workflow. The app gives collaborators only authorized job evidence, not unrestricted access to the operator dashboard.

Do not expose the local app or MLflow publicly before completing [production gates](PRODUCTION-GATES.md). The product value and buyer remain hypotheses to investigate with the first grant-writing pair.
