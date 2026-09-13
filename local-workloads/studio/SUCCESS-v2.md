# What success means after Jai’s rejection

The previous grant and lecture artifacts are rejected baselines. They passed some structural checks, but Jai said the grant lacked humanity and the lecture artifact was not the tool he requested. That feedback changes the workload specification; it does not establish a quantization defect.

| Work | Acceptance criterion | Who decides |
|---|---|---|
| Recipient study | Thirty distinct named recipients, primary announcement links, award classes separated, no invented selection rationale or outcome | Source audit |
| Revised grant | A recognizable person, an existing body of work, a specific concern and a credible next step | Jai; pending |
| Swipe file | Capture, edit, find and reopen real source cards with quotations separate from personal notes | Software checks, then Jai’s actual use |
| Canvas | Real editable canvas; add, move, connect and revise material; save and reopen | Browser and persistence checks |
| Model assistance | Optional selected-source request; suggestion does not silently overwrite the source | Application checks |
| Useful assistance | A suggestion helps Jai find or clarify something he wants to teach | Jai; pending |
| Evidence | Real inference trace, settings and source revisions; explicit usefulness feedback attributed correctly | MLflow readback and UI |
| Restart continuity | Cards and canvas survive restart; previous suggestions can be reopened | Browser/API checks |

## Revised hypothesis

A local model will be more useful as an optional editorial assistant inside Jai’s own preparation practice than as a generator of a complete generic application or lecture from a thin source packet. A source library and freeform canvas may make that preparation concrete enough to judge.

This is a hypothesis about the workload and interaction design. It is not a claim that this interface improves cognition, teaching outcomes or model weights.

## What has been observed

The first local grant met form and arithmetic checks and was rejected for lacking humanity. The lecture artifact was rejected because the requested deliverable was an app. Neither structural correctness nor inference completion captured those failures.

The replacement app has been exercised with real SQLite persistence and actual tldraw editing. A selected-card request to Bonsai returned two questions in about 8.3 seconds, using 394 prompt tokens and 68 completion tokens. The request and response are linked in MLflow and the original card remained unchanged. These observations establish that the mechanism runs. They do not establish that the questions are useful or that a different checkpoint would do better.

The revised grant is an assistant-edited draft informed by the recipient study and Jai’s canonical materials. It is deliberately not reported as an improved Bonsai generation. No false model-comparison win is claimed.

## Next experiment after use

Use the app to prepare one real Courage lecture. Keep five to ten moments where a suggestion was helpful, unhelpful or needed a correction. For each, preserve the source cards, request, output, human decision and a short reason. Do not turn every note into a score or invent preferences before use.

Then freeze those cases as a development set. Change one thing at a time: first the source packet or editorial instruction, then the model with matched settings. Keep separate checks for source fidelity, usefulness and time spent editing. Add held-out cases from later lecture preparation before making a general quality claim.

Investigate whether failures are missing context, a poor question, excessive presumption, inaccurate source use, or model inability. Use prompt/retrieval/interface changes for the first categories. Consider weight training only when repeated, well-labeled failures justify it and training permission and a suitable train/evaluation split exist. No reinforcement learning has been started.
