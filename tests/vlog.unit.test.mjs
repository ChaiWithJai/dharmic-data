import assert from 'node:assert/strict';
import test from 'node:test';

import { vlogEntries } from '../src/data/vlog.mjs';

test('unit: every technical vlog entry has evidence and a bounded next step', () => {
  assert.ok(vlogEntries.length >= 3);
  const slugs = new Set();
  for (const entry of vlogEntries) {
    assert.match(entry.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(slugs.has(entry.slug), false);
    slugs.add(entry.slug);
    assert.ok(entry.questions.length >= 2);
    assert.ok(entry.artifacts.length >= 2);
    assert.ok(entry.tryIt.length >= 3);
    assert.ok(entry.results.length >= 1);
    assert.ok(entry.limits.length >= 1);
    assert.ok(entry.nextExperiment.length >= 20);
    assert.ok(entry.corrections.length >= 1);
    for (const artifact of entry.artifacts) {
      assert.match(artifact.href, /^https:\/\//);
      assert.ok(artifact.label && artifact.kind);
    }
  }
});

test('unit: the featured story keeps public code and local AI separate', () => {
  const shakti = vlogEntries.find((entry) => entry.slug === 'building-shakti-with-public-data');
  assert.ok(shakti);
  const text = JSON.stringify(shakti);
  assert.match(text, /does not use AI/);
  assert.match(text, /local path/);
  assert.match(text, /150 fixed records/);
  assert.equal(shakti.media.src, '/media/shakti-engineering-talk-preview.mp4');
});
