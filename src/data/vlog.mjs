export const vlogEntries = [
  {
    slug: 'building-shakti-with-public-data',
    title: 'How we built a civic data demo without putting AI in the critical path',
    summary: 'We follow one New York City address through matching, public record joins, privacy treatment, and a dated trace. Then we show the separate local path for Hermes and a local model.',
    date: '2026-07-15',
    readTime: '8 minute read',
    label: 'Build note 001',
    outcome: 'A live, no AI web lookup and a separate local path for people who want to study instrumented AI tool use.',
    mediaStatus: 'Watch the first minute of the engineering talk. The written episode below expands the proof, limits, and next experiment.',
    media: {
      src: '/media/shakti-engineering-talk-preview.mp4',
      poster: '/media/shakti-engineering-talk-poster.jpg',
      duration: '1 minute',
      description: 'The preview shows the five borough evaluation map, terminal traces, the Shakti result, the GitHub repository, and the application architecture.',
    },
    questions: [
      'How can one building have two valid street addresses?',
      'Which work is ordinary code, and where can local AI be added?',
      'What did the live deployment and five borough test prove?',
    ],
    artifacts: [
      { label: 'Live Shakti demo', href: 'https://shakti.dharmicdata.org', kind: 'Working demo' },
      { label: 'Public runtime health response', href: 'https://shakti.dharmicdata.org/api/health', kind: 'Runtime proof' },
      { label: 'Five borough evaluation', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/docs/evaluation.md', kind: 'Test evidence' },
      { label: 'Production baseline', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/evals/baseline/netlify-production.json', kind: 'Deployment evidence' },
      { label: 'Local AI extension guide', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/docs/local-ai-extension.md', kind: 'Build guide' },
    ],
    tryIt: [
      'Open the public demo and enter one New York City building address.',
      'Confirm the City suggestion and compare the address you entered with the HPD filing address.',
      'Open Sources and processing record, then connect one result to its named City dataset.',
    ],
    results: [
      'The dated production run joined BIN 1004529 to HPD Building 6533 and returned a valid 13 event trace.',
      'The fixed evaluation ran 30 building records in each borough. All 150 runs passed the privacy scan and trace check.',
    ],
    limits: [
      'One lived address and 150 fixed records do not prove that every New York City address will match.',
      'The tests did not measure whether an advocate finishes research faster or makes fewer errors.',
    ],
    nextExperiment: 'Run observed sessions with civic researchers and community advocates, then publish the confusing matches and the changes they cause.',
    corrections: ['No corrections published.'],
    sections: [
      {
        heading: 'Start with the public need',
        paragraphs: [
          'People should be able to type an address as they know it and see what New York City records say about the building. The hard part is that a map address, an HPD address, and a building identification number can describe the same place in different ways.',
          'We made that mismatch visible. Shakti shows the address a person entered, the address HPD uses, and the building identification number that joins the records.',
        ],
      },
      {
        heading: 'Keep the public demo simple',
        paragraphs: [
          'The hosted lookup does not use AI. Netlify serves the interface and small server functions call official City sources. The result follows fixed rules that we can test and explain.',
          'The local version adds Hermes as an optional explanation layer. This separation lets a civic researcher study local models and tool traces without making the public lookup depend on a model.',
        ],
        links: [
          { label: 'Try Shakti', href: 'https://shakti.dharmicdata.org' },
          { label: 'Read the source', href: 'https://github.com/ChaiWithJai/shakti-seva-studio' },
        ],
      },
      {
        heading: 'Prove the path people will use',
        paragraphs: [
          'We tested a lived address through the deployed site. The result matched NYC building identification number 1004529 to HPD building 6533 and the HPD address 140 Avenue C. The test captured four source receipts and a valid event trace.',
          'That is one known case. It is proof that the full path works for that case, not proof that every City address will match. More borough samples and community review belong in the next round.',
        ],
      },
      {
        heading: 'What comes next',
        paragraphs: [
          'We want contributors to test addresses they understand, report confusing matches, and add public data sources with clear receipts. We also want to show how local models behave when they explain a bounded record packet.',
        ],
        links: [
          { label: 'Open the public runtime health response', href: 'https://shakti.dharmicdata.org/api/health' },
          { label: 'Read the five borough evaluation', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/docs/evaluation.md' },
          { label: 'Inspect the production proof', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/evals/baseline/netlify-production.json' },
          { label: 'Read the local AI adapter guide', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/docs/local-ai-extension.md' },
        ],
      },
    ],
  },
  {
    slug: 'learning-inference-from-the-inside',
    title: 'Learning inference from the inside',
    summary: 'A visual course follows text from tokenization through generation so local AI systems feel less mysterious.',
    date: '2026-07-10',
    readTime: '5 minute read',
    label: 'Learning note 002',
    outcome: 'A public visual guide that helps builders reason about context, memory, and model limits before they deploy.',
    mediaStatus: 'Written episode available. Use the linked visual course for the interactive lesson.',
    media: null,
    questions: ['What happens before a model can generate its first token?', 'How should a small local context limit change an application design?'],
    artifacts: [
      { label: 'Inference the Hard Way', href: 'https://chaiwithjai.github.io/inference-the-hard-way/#01-tokenizer', kind: 'Interactive course' },
      { label: 'Shakti local AI guide', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/docs/local-ai-extension.md', kind: 'Applied guide' },
    ],
    tryIt: ['Open the tokenizer chapter.', 'Enter a short sentence and inspect how it becomes tokens.', 'Write down one limit that should change your application design.'],
    results: ['The local Shakti plan now treats 32K tokens as an upper expectation and starts with smaller bounded packets.'],
    limits: ['This note does not benchmark a model or prove that one context size is right for every machine.'],
    nextExperiment: 'Publish a traced local run that shows prompt size, tool results, compaction, and peak memory in one view.',
    corrections: ['No corrections published.'],
    sections: [
      {
        heading: 'See each step',
        paragraphs: [
          'Inference the Hard Way starts with the tokenizer and moves through the work a language model does to produce text. Each chapter uses a visual explanation that you can inspect in a browser.',
          'This helps when a local model runs out of memory or a long prompt becomes unreliable. You can reason about what the machine is doing instead of treating the model as a single hidden box.',
        ],
        links: [
          { label: 'Open Inference the Hard Way', href: 'https://chaiwithjai.github.io/inference-the-hard-way/#01-tokenizer' },
        ],
      },
      {
        heading: 'Use constraints as part of the design',
        paragraphs: [
          'Our local experiments use a 32K context window as an upper expectation. A useful system should keep the source packet small, compact old conversation state, and make tool inputs visible.',
          'The lesson is practical. A smaller, inspectable workflow can help more than a large model with an unbounded prompt.',
        ],
      },
    ],
  },
  {
    slug: 'a-workbench-for-your-own-data',
    title: 'A workbench for your own data',
    summary: 'Your Wildcard explores how personal tools can stay understandable when AI works with local context.',
    date: '2026-07-03',
    readTime: '4 minute read',
    label: 'Field note 003',
    outcome: 'An open reference for people who want to design local tools around data they control.',
    mediaStatus: 'Written episode available. The linked site contains the current design reference.',
    media: null,
    questions: ['How can a person see what context enters a local AI tool?', 'Which actions should remain under human control?'],
    artifacts: [
      { label: 'Your Wildcard', href: 'https://yourwildcard.ai/', kind: 'Design reference' },
      { label: 'Shakti architecture', href: 'https://github.com/ChaiWithJai/shakti-seva-studio/blob/main/docs/architecture.md', kind: 'Applied architecture' },
    ],
    tryIt: ['Open Your Wildcard.', 'Choose one interface pattern that makes context or action visible.', 'Write how you would apply it to a public data project.'],
    results: ['Shakti now labels the public no AI path separately from its optional local Hermes path.'],
    limits: ['Local software can reduce data sharing, but it does not remove the need for consent, security, or review.'],
    nextExperiment: 'Add a local tool trace view that a nontechnical reviewer can inspect without opening a terminal.',
    corrections: ['No corrections published.'],
    sections: [
      {
        heading: 'Make the work visible',
        paragraphs: [
          'Your Wildcard is a design and engineering reference for personal AI systems. It focuses on the interface around the model, including what context goes in and what actions come out.',
          'Dharmic Data uses the same standard for civic work. A person should be able to tell when a model is involved, which source supplied a claim, and what the software did next.',
        ],
        links: [
          { label: 'Visit Your Wildcard', href: 'https://yourwildcard.ai/' },
        ],
      },
      {
        heading: 'Bring the lesson into public work',
        paragraphs: [
          'Local software can give researchers room to test sensitive workflows without sending every draft to a hosted model. It does not remove the need for consent, security, or review. It gives the builder another deployment choice.',
        ],
      },
    ],
  },
];

export function getVlogEntry(slug) {
  return vlogEntries.find((entry) => entry.slug === slug);
}
