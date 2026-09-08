# Dharmic Data

Dharmic Data is the emerging school Jai Bhagat is building. Conscious Compute is its signature workshop series. A good teacher can change the course of someone's life. A great teacher can change the course of an entire civilization.

The original animated template now connects four pages. Home introduces the belief, `/school` explains Conscious Compute, `/about` tells Jai's NVIDIA hackathon story and holds the supporting film, and `/learn` connects Maven and the field notes. Film production remains paused.

## Start here

Read [the template restoration](docs/template-restoration.md), [the website objective](GOAL.md) and [the current implementation and release notes](docs/teacher-school-website.md). They supersede the older guidance-practice and booking direction in the historical design documents.

The [free production field notes on Maven](https://maven.com/a-plus/o/585d59) explain what making the film taught us about human judgment. Maven handles the resource signup and its delivery message. The Learn page lists verified Lightning Lessons.

## Run from any directory

Set a variable to this checkout's absolute path. Do not run commands against the surrounding `qedc` repository.

```sh
DD_SITE=/Users/jaybhagat/Documents/qedc/dharmic-data-teacher-school
node "$DD_SITE/scripts/dd.mjs" status
node "$DD_SITE/scripts/dd.mjs" build
node "$DD_SITE/scripts/dd.mjs" test
node "$DD_SITE/scripts/dd.mjs" dev
```

`dev` opens the normal site on port 4321. `review` starts a loopback-only preview on port 4327 with the existing private 60-second film. The review script validates the current candidate's SHA-256 hash. It does not generate or copy film media.

```sh
node "$DD_SITE/scripts/dd.mjs" review
```

On another checkout, set `FILM_REVIEW_SOURCE` to the same reviewed file. A production build always excludes the private film. An approved public film can later be configured with `PUBLIC_FOUNDER_FILM_URL` and a matching media-host Content Security Policy.

## Site routes

Home, The School, Jai's Story and Learn use the original template. The existing vlog, Shakti article and shop remain available. Nine learner accounts and four case studies remain in the expandable archive on Learn. The site is static and does not need a model server or an API key.

## Verification

`test` builds the site and runs browser checks at 320, 390, 768 and 1440 pixels. It checks the story hierarchy, keyboard access, media boundaries, Maven destinations and the existing shop and vlog behavior. Screenshots are written to `output/browser-qa`.

A private film check can use a running review server:

```sh
BASE_URL=http://127.0.0.1:4327 REVIEW_FILM_EXPECTED=1 node "$DD_SITE/scripts/verify-dharmic.mjs"
```

## Public status

The school, funded learner places and licensed facilitator program are being developed. Three pilots and a desired larger launch in June 2027 depend on funding and hosts. The website does not claim an operating paid cohort or a completed clinical outcome.
