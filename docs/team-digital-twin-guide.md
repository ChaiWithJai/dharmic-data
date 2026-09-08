# Turn your team's files into gold

The Maven lead magnet now teaches a practical first workflow: use GPT-6 Astra and local AI to turn a team's meeting notes, briefs and spreadsheets into shared context that people can inspect and trust. The promise is less repeated explanation and rework, with more room for judgment and learning. Those are outcomes to measure with a real team, not results established by this guide.

The canonical title is **Turn your team's files into gold**. Its subtitle is **Build your team's digital twin with GPT-6 Astra + local AI**. The existing Maven resource stays at https://maven.com/a-plus/o/585d59 so website and previously shared links remain useful. This replaces the film retrospective as the primary lead magnet; the earlier PDF remains historical material rather than being silently overwritten.

## What the reader makes

A team digital twin is a maintained, permissioned model of goals, roles, decisions, standards and open questions. It starts as a folder the team controls. It does not require training a model, cloning personalities or monitoring colleagues.

The guide uses one recurring handoff and five source files. Local AI can perform bounded extraction when its output can be checked. Astra helps with planning, synthesis and unresolved ambiguity using context approved for cloud use. A human owns consent, commitments and release. Codex subscription access is developer tooling; it is not an application-serving API entitlement. The document does not promise that multiple computers pool their memory automatically.

The team decides how any measured gains are shared: protected learning time, reduced load, compensation or ownership. A context system alone does not solve low pay or staffing.

## Production artifacts

The source artifact folder, relative to this checkout, is `../outputs/team-digital-twin-guide-2026-09-08/`.

- `output/pdf/turn-your-teams-files-into-gold.pdf`: the produced 14-page guide.
- `source/build_guide.py`: the PDF source, with its font assets and licenses in `source/fonts/`.
- `source/guide-text.txt`: extracted text for review.
- `tmp/pdfs/final-01.png` through `final-14.png`: rendered pages for visual review.
- `output/pdf/guide-checks.json`: PDF structure, text, link and bounds checks.
- `starter-kit/`: the 17-file companion, including five fictional originals, context and brief, source manifest, claims, three prompts, ledgers, a verifier and its receipt.
- `research/editorial-review.md`: review of the reader promise and practical workflow.

The PDF receipt records 14 pages, 58,125 bytes and SHA-256 `8e04a80006c2bbf2b091f30dc7aabe1a989a526a29a6830792f8f11c2d44acb6`. It records text on every page, seven links and 219 checked text bounds. Publication should use the final file and a new verified hash if the PDF changes.

## What was tested

The example is synthetic and manually curated. Its five source files contain 21 claims. The verifier checks source hashes, exact source quotes and line coverage, preserves the unresolved 12-versus-18 participant conflict, leaves an unaccepted invitation owner unassigned, and checks the $390/$435 budget scenarios.

Seven negative checks reject a changed source hash, a silently excluded source, a fabricated quote, a missing content claim, an erased disagreement, a promoted unaccepted owner and incorrect budget arithmetic. These checks demonstrate the example's integrity checks. They do not establish model extraction accuracy, real-world truth, actual consent or a team's productivity improvement.

Website checks pass all 29 existing data and repository-helper cases. Home and Learn pass browser checks at 320, 390 and 1440 pixels, including text bounds, original typography, keyboard navigation, Maven destinations and running Rive animations. The isolated build at `/tmp/dharmicdata-team-guide-20260908` contains all 13 expected HTML routes. Receipts and selected screenshots are in `output/team-guide/` in this checkout.

## Website and workstream boundaries

The original Webflow template, Fredoka/Inter typography, illustrations, pills and animations are retained. Only guide copy changed in the shared header, Home teaser, Learn metadata and resource card, and the founder-film cross-link. `/learn#field-notes` and the existing `MAVEN_FILM_GUIDE_URL` / `getFilmGuide` names remain for compatibility.

Film production remains paused. The guide does not accept, regenerate or publicly release the 60-second working film. Existing shop, vlog, school, founder and learner evidence remain intact.

## Publication status

**Published September 8, 2026.** Source commit `d435e94e1c84bfe13a7667ac174af0e80acac38f` is live in Netlify production deploy `6a9f94de15d51b6aa033a726`. Six live destinations match the tested artifact byte-for-byte, including the PDF and ZIP. Maven displayed “Updates published!” and the public resource shows the new title, 14-page promise, free signup and guide button. Its saved delivery page contains both verified downloads. A real subscriber inbox/unsubscribe test remains open.

A real inbox, subscriber and unsubscribe test remains open in issue #3. No subscriber was invented and no broadcast was sent. Maven owns the actual signup and delivery flow; the website must not simulate a successful email signup.


## Accounting for this revision

This revision used Codex with three bounded subagents, local Python for PDF production and integrity checks, browser automation for Maven, and the existing Netlify site. No paid inference API, local model inference, fleet worker, film renderer or new service purchase was used. Codex tokens, electricity, peak memory and human review time were not measured for a reliable total. The 17-file ZIP is 20,635 bytes with SHA-256 `07f192fd0f93c5b48da7b2ad51c5b0bac1214d959380c02a469ba53e761a02a6`.

The 1200 by 630 sharing artwork exists in the artifact folder but was not uploaded: Maven’s image chooser did not open through the browser tool. This does not affect PDF or ZIP delivery. Public signup and configured delivery were read back; no broadcast or test subscription was sent.
