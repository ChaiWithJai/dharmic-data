# Dharmic Data

Dharmic Data publishes working software and engineering stories for social
good. The site links each public claim to a demo, source file, dated test, or
known limit.

The first featured project is Shakti Seva Studio. Its hosted building lookup
uses live New York City data and ordinary code. The separate local edition lets
researchers study Hermes and local model tool use.

## Run the site

You need Node.js 24 or newer.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:4321`.

## Content structure

The launch site has one home page and a technical vlog.

```text
/
/vlog/
/vlog/{slug}/
```

Vlog entries live in `src/data/vlog.mjs`. Every entry includes questions,
artifacts, a task to try, observed results, limits, the next experiment, and
corrections.

## Verify a release

The release gate has three layers.

### Acceptance and browser tests

```bash
npm run build
npm run test:acceptance
```

This checks the home page and vlog at 390, 1024, and 1440 pixels. It also checks
reduced motion, accessible link names, target sizes, overflow, and browser
errors.

### Integration tests

```bash
npm run build
npm run test:integration
```

This checks the public route tree, internal links, canonical metadata, Netlify
headers, and removal of the old A+ site.

### Unit data tests

```bash
npm run test:unit
```

This checks every vlog entry and its artifacts, results, limits, and correction
record.

## Deploy

Netlify runs `npm run build` and publishes `dist`. The production site is
[dharmicdata.org](https://dharmicdata.org).

The site is static. It has no account, form, database, analytics script, or
model call.

## Contribute

Start with one bounded change. Link every factual claim to its source or mark
it as a plan. Run all three test layers before opening a pull request.

Dharmic Data is independent. It does not represent a public agency or a faith
community.
