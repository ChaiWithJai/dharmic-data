# Dharmic Data

Dharmic Data publishes civic technology demos, source code, and test evidence. The goal is to help people study a working project and make something useful for their community.

The first project is [Shakti](https://shakti.dharmicdata.org). Shakti lets a person enter a New York City building address and inspect public housing records. The public result uses ordinary code and City data. It does not use AI.

## What is in this repo

The site has four routes:

- `/` explains the project and links to the working demo.
- `/vlog` lists the technical build stories.
- `/vlog/how-we-built-shakti` includes a one minute video, captions, a transcript, and source links.
- `/404` returns people to the working demo.

The site is static. Netlify can host it without a Python server, a model server, or API keys.

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

## Paid work

Paid office hours are the only current paid path. The site shows a booking link only when `PUBLIC_CALENDAR_URL` is set.

Repository editions are not for sale. A supported repository edition is a possible next product. We will add it only after there is a clear license, support policy, checkout, and delivery process.

## Public status

Dharmic Data is an independent project. It is not a New York City service. The Shakti result links to the City sources that support it.
