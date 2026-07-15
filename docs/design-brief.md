# Dharmic Data design brief

## Project overview

Dharmic Data is a public home for software experiments made to help people. The site will show working demos and publish the evidence behind them. It will also explain how other people can build on the work.

The first featured project is Shakti Seva Studio. It helps a person check what New York City housing records say about one building. The public version uses live City data and ordinary code. People who want to study local AI can download the repository and add Hermes or another local model.

Jai is the project owner and the host of the technical vlog. The GitHub repositories, public demos, test results, and source records are the proof.

## Problem statement

People who want to use technology for public work often see polished claims without working software, source links, test evidence, or a clear way to begin. This makes it hard to tell what is useful and hard to learn from the work.

Dharmic Data will give civic technology researchers, community advocates, students, and public servants a direct path from an idea to a working demo, its evidence, its code, and a practical next step.

## Audience

The primary visitor wants to use software or public data to help people. They may be a civic technology researcher, community advocate, student, designer, engineer, or public servant. They need plain explanations and visible proof before they invest time in a repository.

The secondary visitor is an experienced builder who wants the system design, data sources, test method, traces, limits, and deployment choices.

## Goals

The site should help a visitor do one of these things during the first visit:

1. Try a working public demo.
2. Open the source and follow a tested starting path.
3. Watch a technical account of how the project was made.

The site should also make the boundary between ordinary software and AI clear. It should state what is live, what was tested, what remains local, and what has not been proved.

## Success criteria

The first release is successful when:

1. A new visitor can explain what Dharmic Data does after reading the first screen.
2. A visitor can reach the Shakti demo, its source, or the vlog in one click from the home page.
3. Every featured project links to a live result, source code, evidence, and known limits.
4. The home page does not make a claim that its linked evidence cannot support.
5. The page works on a narrow phone screen and with a keyboard.
6. The production build passes the repository checks and is available at `https://dharmicdata.org`.

Measure the first three items with five first click tests before adding more sections. Use production links and browser checks for the remaining items.

## Scope

The first release includes:

1. One landing page for the mission and featured work.
2. One featured Shakti project card with live links and proof.
3. A technical vlog index.
4. A reusable page shape for each vlog episode.
5. A small statement about the name and the publishing standard.

The first release does not include user accounts, a project submission system, a community forum, consulting offers, or claims about public impact that have not been measured.

## Constraints

The site uses the existing Astro and Netlify project. The design can reuse the working page generation and local assets, but it must remove A+ Active Services sales language from the public Dharmic Data pages.

The site must use plain language. It must identify outside data sources and official public resources. It must distinguish a working feature from a planned feature.

The word "dharmic" can be explained as work guided by service and responsibility. The site should not claim to represent a faith, culture, public agency, or community.

## Inputs

The team should use these items as source material:

1. The Shakti public demo at `https://shakti.dharmicdata.org`.
2. The Shakti source at `https://github.com/ChaiWithJai/shakti-seva-studio`.
3. The Shakti five borough evaluation, production proof, and engineering notes.
4. Jai's technical videos and experiments.
5. Official source pages for any public data used by a project.

## Deliverables

The first release requires the landing page and the vlog index. It also requires one complete vlog entry, social preview metadata, and production browser evidence. The owner should review the exact copy and each link before publication. The owner should also check each source claim and the mobile layout.
