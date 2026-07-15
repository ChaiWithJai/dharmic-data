# Dharmic Data information architecture

## Main visitor tasks

The structure starts with the tasks a visitor came to do:

1. Understand the purpose.
2. Try a working project.
3. Check the proof.
4. learn how it was made.
5. Build or extend it.

## Launch sitemap

```text
Home  /
  Mission
  Featured project
    Try the demo
    Read the proof
    View the source
    Follow the local AI guide
  How we work
  Latest from the technical vlog
  About the name
  Build something useful

Technical vlog  /vlog/
  Episode  /vlog/{slug}/
    Watch
    Read
    Inspect the artifacts
    Try it yourself
    Read what we learned

Project links
  Shakti public demo  https://shakti.dharmicdata.org
  Shakti source  https://github.com/ChaiWithJai/shakti-seva-studio
```

The home page and vlog are the only primary sections at launch. The demo and GitHub repository remain separate because they already have their own jobs.

## Navigation

The header uses these labels:

1. `Projects` scrolls to the featured project.
2. `Technical vlog` opens `/vlog/`.
3. `How we work` scrolls to the publishing standard.
4. `View the source` opens the Dharmic Data repository.

The footer repeats `Projects`, `Technical vlog`, `GitHub`, and `About the name`. Every vlog entry links back to the home page, the vlog index, and the project it covers.

## Content model

### Project

A project has these fields:

1. `title`
2. `plainSummary`
3. `peopleServed`
4. `status`, using `live`, `research`, or `archived`
5. `publicDemoUrl`
6. `sourceUrl`
7. `proofUrl`
8. `localGuideUrl`, when a local version exists
9. `dataSources`
10. `whatWorks`
11. `knownLimits`
12. `lastVerifiedDate`
13. `coverImage`
14. `coverAlt`
15. `relatedEpisodes`

The site must not show `live` unless the production demo and its main result path have passed a browser check.

### Vlog episode

A vlog episode has these fields:

1. `title`
2. `slug`
3. `summary`
4. `publishedDate`
5. `updatedDate`
6. `videoUrl`
7. `posterImage`
8. `posterAlt`
9. `duration`
10. `project`
11. `questionsAnswered`
12. `chapters`
13. `artifacts`
14. `commands`
15. `results`
16. `limits`
17. `nextExperiment`
18. `transcript`

### Artifact

An artifact has a `label`, `kind`, `url`, `description`, and `verifiedDate`. The `kind` can be a demo, source file, test result, trace, screenshot, diagram, public dataset, or official guide.

## Homepage section order

1. The first screen states the purpose and offers the demo and vlog.
2. The featured project gives a visible result before it explains the system.
3. The proof section names the live data, tests, and limits.
4. The method section explains how projects are selected and published.
5. The vlog section offers the newest technical account.
6. The final section asks the visitor to try, study, or build.

This order gives a visitor evidence before background. It also gives a visitor a useful exit at every stage.

## Labels and terms

Use these terms everywhere:

1. Use `project`, not `solution` or `innovation`.
2. Use `working demo` only when the public path works.
3. Use `proof` for tests, traces, source receipts, or dated browser checks.
4. Use `technical vlog` for the video and written record.
5. Use `local AI` when the model runs on the person's own computer.
6. Use `public data` only when the source is named and linked.

## Validation before adding more pages

Ask five target visitors to find the working demo, the source code, the test evidence, and the newest vlog entry. Record their first click. Change a label if more than one person chooses the wrong path.
