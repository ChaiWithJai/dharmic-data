# Teacher-led website

The single-page visual treatment described below was superseded by Jai's template correction. Read [the multi-page template restoration](template-restoration.md) for the current layout and page ownership. The mission, Maven resource and paused-film boundaries remain.

This direction supersedes the older guidance-practice and four-span hero plans in this repository. Read [parent issue #2](https://github.com/ChaiWithJai/dharmic-data/issues/2), [the opening issue #1](https://github.com/ChaiWithJai/dharmic-data/issues/1), and [the Maven issue #3](https://github.com/ChaiWithJai/dharmic-data/issues/3).

## What the visitor should understand

A good teacher can change the course of someone's life. A great teacher can change the course of an entire civilization. Jai is building a school that pays people to develop the judgment to shape their communities' AI future. They can start learning with him now through Maven.

Homer connects this belief to stories carried through generations of teaching. The shelf lives at `https://literature.dharmicdata.org`; the `.com` spelling did not resolve. Plato's Republic X reports Homer's reputation as an educator while disputing his place in education. We link to that debate rather than treating it as an endorsement of our school.

The NVIDIA hackathon leads the founder story. The win with friends expresses a method of care and imagination. The hardware expanded work Jai had been doing since 2022. It does not establish clinical efficacy or a proven paid cohort.

## Film boundary

The 60-second film is supporting material below the founder story. The surrounding text explains the concept, inspiration and significance. Production remains paused and the current film remains unaccepted. No rendering or new model call was made to change it during this website work.

`node scripts/review.mjs` starts the private review at `http://127.0.0.1:4327/`. The script locates its own checkout and the existing local candidate. It validates SHA-256 `2ec327cf59992f5735df857c8b01db009c6d665fdbfbc2e855fdf963fc5c89d5`. The development middleware supports seeking and does not copy the file into the site. The listener was checked with `lsof` and bound to `127.0.0.1`.

The production build has an original poster and a truthful preparation status. Its private film endpoint returns 404. The transcript and draft captions come from the recorded narration placements. They do not establish word-level timing or creative acceptance. A future public film URL also needs its host allowed by the site's media Content Security Policy.

## Maven and PDF

The free resource is [A film is not finished when it renders](https://maven.com/a-plus/o/585d59). Maven displayed “Successfully published”; the live page contains the title, free price, email field and resource button. The delivery message includes the PDF and the Lightning Lessons link. No subscriber was created and no broadcast was sent.

Maven's direct attachment could not be verified, so its draft attachment was removed. The delivery message uses a [stable versioned PDF](https://raw.githubusercontent.com/ChaiWithJai/dharmic-data/3f3ebf60501b5d9396e9e64e571ee7335ef1a537/public/resources/conscious-compute-field-notes.pdf). HTTP 200, file length and SHA-256 were verified after publication.

The PDF has six pages and is 43,349 bytes. SHA-256 is `c9e78bdc8f27a8241fe9dc3d4a6e348e2c6bc18320fa5b2d7c86a7ca8dcc5676`. Each page was rendered and visually reviewed. A copy is in `public/resources`. Source, visual renders and receipts are in the sibling `outputs/dharmicdata-teacher-website-2026-09-08` folder. The public copy excludes private machine paths and credentials.

A real email delivery and subscriber/unsubscribe test remains unperformed. Maven's configured behavior and public signup were verified; inbox arrival was not. The website does not simulate successful signup.

`src/data/learning.ts` contains the published resource and the two verified lesson dates. The component handles dates that have passed without promising recording access. `.env.example` documents the optional Maven override.

## Working from another directory

This branch is `codex/teacher-school-20260908`, based on `codex/data-storefront` at `c31ef33`. The source checkout was `qedc/tmp/dharmic-data-live`. Existing storefront work was kept because it was newer than `main`.

Use a task-specific variable and the repository-aware helper:

```sh
DD_SITE=/Users/jaybhagat/Documents/qedc/dharmic-data-teacher-school
node "$DD_SITE/scripts/dd.mjs" status
node "$DD_SITE/scripts/dd.mjs" build
node "$DD_SITE/scripts/dd.mjs" test
node "$DD_SITE/scripts/dd.mjs" review
```

The helper was invoked successfully from the surrounding workspace. It reports this worktree rather than the parent repository. Do not use the parent repository's Git status or Netlify configuration for this site.

## Verification and accounting

The production build passes. Browser checks cover 320, 390, 768 and 1440 pixels, the teacher headline, founder-to-film order, keyboard navigation, reduced motion, nine learner accounts, four cases, Maven destinations, About, vlog and shop. The first run found a rotated book overflowing at 320 pixels and footer links under 44 pixels tall. Both were corrected and production checks passed.

The PDF contains scoped measurements from the prior film record. These are not the cost of this website task. This task used Codex and parallel Codex workers for the bounded copy and browser work. No new paid inference API, model download or fleet inference run was used. Exact per-worker tokens, dollar cost, power use and peak memory for this task were not measured. There was no purchased hosting or Maven service in this work.

The app would not replace the unfinished film goal. It was left stalled, with the new website objective recorded in `GOAL.md` and issue #2. Do not mark the film complete to work around this limitation.

## Remaining review

The school calendar still needs to be reconciled with the grant application. The site gives a desired June 2027 larger launch and conditional pilots, without publishing enrollment dates. The film's creative acceptance and public release belong to its paused workstream. The subscriber test remains in #3.

A short writing comparison is available locally at `/tmp/revision-dharmicdata-teacher.html`.

## Published release

The website is live at https://dharmicdata.org. Netlify production deploy `6a9f895fe5e9719b7c9f99dc` publishes the clean artifact from code commit `5f87010`. The [source PR is #4](https://github.com/ChaiWithJai/dharmic-data/pull/4). Production was updated directly; the PR has not been merged into the configured `main` branch. Review and merge that source update before another deployment from `main`, which still contains the earlier site.

The clean build has 435 files and 11 HTML routes, without the generated duplicate copies found in the working `dist`. The live domain returned byte-identical HTML/assets for twelve checked destinations. Its private film endpoint returned 404. Browser checks on the same deployed artifact found no errors on phone or desktop. The URL/date/path-helper checks passed 29 of 29 cases. The private review decoded the 60-second video and sought to 45 seconds successfully.

Verification receipts and screenshots are in `output/release`. Acceptance checks cover the reader and navigation flows. Integration checks cover Maven destinations, production headers and media boundaries. Data/helper checks cover invalid inputs, dates and repository resolution. The remaining email inbox test is documented in issue #3; the film goal stays paused.
