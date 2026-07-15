# Technical vlog content model

## Purpose

The technical vlog records how each Dharmic Data project was made. Each entry should help a visitor understand the public need and inspect the proof. It should also give the visitor one part of the work to try.

The video and article share one set of facts. The article is a permanent record for the video. It holds the links and commands. It also holds the dated results, transcript, and corrections that a viewer may need later.

## Entry structure

Each entry uses this order:

1. State the person and task.
2. Show the working result.
3. Name the data and system boundary.
4. Walk through one engineering decision.
5. Show the test and trace.
6. State what failed or remains uncertain.
7. Give the viewer one thing to try.
8. Name the next experiment.

## Required page blocks

### Entry header

Include the title, summary, project, publication date, update date, duration, and video.

### What you will learn

List the questions answered by the entry. Each question should be answered by a visible artifact later on the page.

### Watch and read

Place the video first and the full transcript after it. Add chapter links that work in the player and transcript.

### Artifacts

Link every artifact shown on screen. Give each link a plain description and a date when the date affects the claim.

### Try it yourself

Give a bounded task that a new visitor can complete. Include the expected result and the common failure. Do not ask the visitor to install a local model unless the entry is about local AI.

### Results and limits

Separate observed results from conclusions. State the sample, date, and conditions. List what the result did not test.

### Corrections

Keep a dated list of changes to facts, commands, or conclusions. If there are no corrections, say `No corrections published.`

## Episode page labels

Use these labels in the interface:

1. `Watch the build`
2. `What you will learn`
3. `Artifacts shown in this episode`
4. `Try it yourself`
5. `What the test showed`
6. `What this did not prove`
7. `What we will test next`
8. `Corrections`

## First episode brief

Title: `How we built a civic data demo without putting AI in the critical path`

Summary: `We follow one New York City address through address matching, public record joins, privacy treatment, and a dated trace. Then we show the separate local path for Hermes and a local model.`

The viewer should be able to answer these questions:

1. Which part of Shakti uses live public data?
2. Which part uses ordinary code?
3. What does the NYC Building Identification Number do?
4. What did the five borough evaluation test?
5. Where can a local model be added, and what is it allowed to do?

Use these chapters:

1. `00:00 The result first`
2. `00:35 The person and the task`
3. `01:30 One address, three City names`
4. `03:00 The public data path`
5. `05:30 The privacy treatment`
6. `07:00 The trace and test evidence`
7. `09:30 The public version without AI`
8. `11:00 The local Hermes path`
9. `13:00 What failed and what we changed`
10. `14:30 Try it yourself`

Show these artifacts on screen and link them from the page:

1. The live Shakti page with `700 E 9th Street` entered.
2. The address alias explanation for `140 Avenue C` and BIN `1004529`.
3. The four source receipts.
4. The valid 13 event trace.
5. The five borough evaluation map.
6. The public runtime health response with `ai.enabled: false`.
7. The local AI adapter guide.

The task for the viewer is:

1. Open the public demo.
2. Search one New York City building address.
3. Check the City building name and source dates.
4. Open the GitHub repository and find the source list.

Expected result: the visitor can connect one result on screen to its named City source without running a model.

Common failure: the address a person knows may differ from the address HPD uses. The page should explain the shared BIN and ask the person to confirm the building.

## Publication check

Before publishing an entry, confirm that:

1. Every claim has an artifact or is clearly marked as opinion.
2. Every command was run from a clean setup.
3. Every public link works.
4. The transcript matches the final video.
5. The page names at least one limit.
6. A person can complete the try it yourself task.
