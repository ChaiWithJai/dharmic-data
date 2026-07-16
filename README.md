# Dharmic Data

Dharmic Data is Jai Bhagat's AI guidance practice and public record of a transition. Jai has spent more than ten years across software and teaching, including production engineering at HashiCorp and instruction at Parsons. He helps people choose a useful AI project, test it against their work, and decide what is worth doing next.

For years, much of Jai's economic empowerment teaching was free. Paid one-to-one sessions now support the time to publish working projects, document what succeeds and fails, and learn what a future nonprofit collective should become by June 2027. Dharmic Data is not a nonprofit entity today.

The first project is [Shakti](https://shakti.dharmicdata.org). Shakti lets a person enter a New York City building address and inspect public housing records. The public result uses ordinary code and City data. It does not use AI.

## What is in this repo

The site has five routes:

- `/` keeps the original animated template homepage and introduces the working method and demo.
- `/about` carries Jai's full story, the transition through June 2027, the differentiated method, and the current guidance offer without replacing the homepage hero.
- `/vlog` lists the technical build stories.
- `/vlog/how-we-built-shakti` includes a one minute video, captions, a transcript, and source links.
- `/404` returns people to the working demo.

The site is static. Netlify can host it without a Python server, a model server, or API keys.

The [messaging architecture](docs/messaging-architecture.md) records the audience, customer problems, differentiated method, current offer, planned tests, and copy boundaries used on the site.

## Try it

1. Open [Shakti](https://shakti.dharmicdata.org).
2. Search one New York City building address.
3. Check the City building name, the BIN, and the source dates.
4. Open the [Shakti source](https://github.com/ChaiWithJai/shakti-seva-studio) and find the source list.

## Run this site

```sh
npm install
npm run dev
```

Open `http://localhost:4321`.

## Check a release

```sh
npm run build
npm run preview -- --port 4325
npm run verify:dharmic
```

The check opens the built site at mobile and desktop widths. It also fails if old template sales pages, carts, social links, or placeholder values return.

## Where AI fits

The public Shakti path does not use AI. The Shakti repo has an optional local research path for Hermes. That path can explain a treated data packet and record tool calls. A model cannot change the public source record or choose the public next step.

## Work with Jai

The [AI Guidance Counselor session](https://cal.com/chaiwithjai/ai-guidance-counselor) is 60 minutes and costs $125. Bring one workflow, folder, repository, or decision. You leave with a clear project, a 30 day test plan, a subscription recommendation, and clear data boundaries.

The [Codex and Claude Code Personal Training session](https://cal.com/chaiwithjai/codex-claude-code-training) is 45 minutes and costs $85. You need an active paid ChatGPT or Claude subscription by the time of the session.

The homepage uses the guidance session as its default booking link. Set `PUBLIC_CALENDAR_URL` if you need to point a preview or deployment at a different event.

Repository editions are not for sale. A supported repository edition is a possible next product. We will add it only after there is a clear license, support policy, checkout, and delivery process.

## Public status

Dharmic Data is an independent project working toward a nonprofit collective by June 2027. It is not a registered nonprofit today, and it is not a New York City service. The Shakti result links to the City sources that support it.
