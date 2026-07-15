import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const expected = [
  '404.html',
  'index.html',
  'vlog/a-workbench-for-your-own-data/index.html',
  'vlog/building-shakti-with-public-data/index.html',
  'vlog/index.html',
  'vlog/learning-inference-from-the-inside/index.html',
];

function htmlFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    return entry.isDirectory() ? htmlFiles(path.join(directory, entry.name), relative) : relative.endsWith('.html') ? [relative] : [];
  });
}

test('integration: the build publishes only the home and technical vlog routes', () => {
  assert.deepEqual(htmlFiles(dist).sort(), expected);
  const allFiles = fs.readdirSync(dist, { recursive: true }).filter((name) => typeof name === 'string');
  assert.equal(allFiles.some((name) => /aplus|webflow|healthcare/i.test(name)), false);
});

test('integration: built pages keep truthful links and canonical metadata', () => {
  const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const episode = fs.readFileSync(path.join(dist, 'vlog/building-shakti-with-public-data/index.html'), 'utf8');
  assert.match(home, /Dharmic Data is building an open AI ecosystem for social good/);
  assert.match(home, /public Shakti critical path uses fixed rules/);
  assert.match(home, /https:\/\/shakti\.dharmicdata\.org/);
  assert.match(home, /https:\/\/github\.com\/ChaiWithJai\/dharmic-data/);
  assert.match(home, /rel="canonical" href="https:\/\/dharmicdata\.org\//);
  assert.match(episode, /What this did not prove/);
  assert.match(episode, /Artifacts from this episode/);
  assert.match(episode, /shakti-engineering-talk-preview\.mp4/);
  assert.doesNotMatch(`${home}${episode}`, /A\+ Active|Join for \$197|REPLACE_/i);
});

test('integration: Netlify config sets the expected public security boundary', () => {
  const config = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /Strict-Transport-Security/);
});
