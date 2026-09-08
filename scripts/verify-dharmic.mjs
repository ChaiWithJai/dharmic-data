import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Default: built production site. Private review:
// BASE_URL=http://127.0.0.1:4327 REVIEW_FILM_EXPECTED=1 npm run verify:dharmic
// Pin a separately approved field-notes URL with MAVEN_GUIDE_EXPECTED_URL.
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4325';
const filmExpected = process.env.REVIEW_FILM_EXPECTED === '1';
const output = filmExpected ? 'output/browser-qa/private-review' : 'output/browser-qa';
const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const homeHeading = 'A great teacher can change the course of an entire civilization.';
const schoolURL = 'https://maven.com/a-plus';
const lessonURLs = [
  'https://maven.com/p/06e5fe/comparing-claude-v-chat-gpt-for-work-w-live-prompting',
  'https://maven.com/p/f34cd1/claude-v-local-ai-live-demo-on-nvidia-s-grace-blackwell',
];
const guideURL = process.env.MAVEN_GUIDE_EXPECTED_URL || 'https://maven.com/a-plus/o/585d59';
const failures = [];
let preview;
let browser;
let successMessage;
fs.mkdirSync(output, { recursive: true });
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const check = (condition, message) => { if (!condition) failures.push(message); };
const filesUnder = (root) => fs.existsSync(root) ? fs.readdirSync(root, { recursive: true }).map(String) : [];

function checkBuild() {
  const rendered = filesUnder('dist').filter((file) => file.endsWith('.html'));
  const staticPages = filesUnder('src/pages').filter((file) => file.endsWith('.astro') && !file.includes('[')).map((file) => {
    const name = file.replace(/\.astro$/, '');
    if (name === '404') return '404.html';
    return name === 'index' || name.endsWith('/index') ? `${name}.html` : `${name}/index.html`;
  });
  const publicPages = filesUnder('public').filter((file) => file.endsWith('.html'));
  const expected = new Set([...staticPages, ...publicPages, 'atlas/index.html', 'vlog/how-we-built-shakti/index.html']);
  check(rendered.length >= expected.size, `build: expected at least ${expected.size} current routes, found ${rendered.length}`);
  for (const file of expected) check(rendered.includes(file), `build: missing ${file}`);
  // Detect abandoned copy without requiring the old template or banning Jai's A+ Active practice.
  const placeholders = [/REPLACE_/, /nexia-agency/i, /impactful digital products/i, /Which plan should I buy/i];
  for (const root of ['src/pages', 'dist']) for (const file of filesUnder(root).filter((file) => /\.(astro|html)$/.test(file))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const pattern of placeholders) check(!pattern.test(source), `${root}/${file}: leftover ${pattern}`);
  }
  if (!filmExpected) {
    check(!fs.readFileSync('dist/index.html', 'utf8').includes('/review-media/'), 'production build exposes the private film endpoint');
    check(!filesUnder('dist').some((file) => file.startsWith('review-media/')), 'production build contains private review media');
  }
  return rendered.length;
}

async function checkFilmMedia(page, video, label) {
  const endpoint = `${baseURL}/review-media/founder-film.mp4`;
  const head = await page.request.head(endpoint);
  const size = Number(head.headers()['content-length']);
  check(head.status() === 200 && Number.isSafeInteger(size) && size > 1024, `${label}: private film HEAD metadata is invalid`);
  check(head.headers()['accept-ranges'] === 'bytes', `${label}: private film does not advertise byte ranges`);
  check(/private/.test(head.headers()['cache-control'] || '') && /no-store/.test(head.headers()['cache-control'] || ''), `${label}: private film lacks nonpersistent private caching headers`);
  if (Number.isSafeInteger(size) && size > 2048) {
    // Request a later file segment explicitly; a 200 full-file response would
    // hide a broken Range handler even when metadata initially plays.
    const start = Math.floor(size / 2);
    const end = start + 1023;
    const segment = await page.request.get(endpoint, { headers: { Range: `bytes=${start}-${end}` } });
    check(segment.status() === 206, `${label}: byte-range seek request did not return 206`);
    check(segment.headers()['content-range'] === `bytes ${start}-${end}/${size}`, `${label}: incorrect Content-Range for a later segment`);
    check((await segment.body()).length === 1024, `${label}: byte-range response has the wrong body length`);
    await segment.dispose();
  }
  await head.dispose();
  await page.waitForFunction(() => {
    const film = document.querySelector('#film video');
    return film && film.readyState >= 1 && Number.isFinite(film.duration) && film.videoWidth > 0 && !film.error;
  }, null, { timeout: 15000 });
  const metadata = await video.evaluate((film) => ({ duration: film.duration, width: film.videoWidth, height: film.videoHeight, paused: film.paused }));
  check(Math.abs(metadata.duration - 60) < 0.1 && metadata.width >= 1280 && metadata.height >= 720, `${label}: unexpected review-film metadata ${JSON.stringify(metadata)}`);
  check(metadata.paused, `${label}: review film started playback automatically`);
  // Paused frame decoding tests real seeking without playing unrequested audio.
  await video.evaluate((film) => { film.muted = true; film.currentTime = 45; });
  await page.waitForFunction(() => {
    const film = document.querySelector('#film video');
    return film && !film.seeking && film.readyState >= 2 && Math.abs(film.currentTime - 45) < 0.25 && !film.error;
  }, null, { timeout: 15000 });
  await video.screenshot({ path: `${output}/film-seek-45s.png` });
  console.log(`Private film verified: ${size} bytes; ${metadata.width}x${metadata.height}; ${metadata.duration.toFixed(3)}s; HTTP 206 later-byte range and decoded paused seek at 45s.`);
  await video.evaluate((film) => { film.currentTime = 0; });
}

async function checkHome(page, label, reducedMotion, inspectMedia) {
  check(normalize(await page.locator('#hero-title').innerText()) === homeHeading, `${label}: teacher headline changed`);
  const order = await page.evaluate(() => {
    const story = document.querySelector('#story .founder-grid');
    const film = document.querySelector('#film');
    return Boolean(story && film && (story.compareDocumentPosition(film) & Node.DOCUMENT_POSITION_FOLLOWING)
      && film.getBoundingClientRect().top >= story.getBoundingClientRect().bottom - 1);
  });
  check(order, `${label}: film must follow the complete founder story`);
  for (const id of ['learn', 'field-notes']) {
    check(await page.locator(`#${id}`).count() === 1, `${label}: missing or duplicate #${id}`);
    check(await page.locator(`a[href="#${id}"]`).count() > 0, `${label}: no link to #${id}`);
  }
  const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href'))
    .filter((href) => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1)))));
  check(!brokenAnchors.length, `${label}: broken local anchors ${brokenAnchors.join(', ')}`);
  check(await page.locator('input[type="email"], form').count() === 0, `${label}: unexpected local signup form; signup belongs on Maven`);
  const actualLessons = await page.locator('.lesson-link').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  check(JSON.stringify(actualLessons) === JSON.stringify(lessonURLs), `${label}: Lightning Lessons must use the two verified Maven pages`);
  check(await page.locator('.notes-cta').getAttribute('href') === guideURL, `${label}: field-notes destination differs from the pinned Maven destination`);
  const mavenLinks = await page.locator('a[href*="maven"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const allowedMaven = new Set([schoolURL, ...lessonURLs, guideURL]);
  check(mavenLinks.length >= 4, `${label}: missing Maven school, lessons or field-notes links`);
  for (const href of mavenLinks) {
    const url = new URL(href);
    check(url.protocol === 'https:' && url.hostname === 'maven.com' && !url.username && !url.password && !url.port && allowedMaven.has(href), `${label}: unverified Maven link ${href}`);
  }
  if (guideURL === schoolURL) check(/being prepared|coming next/i.test(await page.locator('#field-notes').innerText()), `${label}: unpublished guide is presented as available`);
  const staleLessons = await page.locator('[data-lesson-ends]').evaluateAll((lessons) => lessons.filter((lesson) => {
    const ended = Date.now() >= Date.parse(lesson.dataset.lessonEnds);
    return lesson.dataset.lessonPhase !== (ended ? 'past' : 'scheduled');
  }).length);
  check(staleLessons === 0, `${label}: lesson availability has not followed the actual date`);
  const video = page.locator('#film video');
  if (filmExpected) {
    check(await video.count() === 1, `${label}: private review video missing`);
    if (await video.count()) {
      check(await video.locator('source').getAttribute('src') === '/review-media/founder-film.mp4', `${label}: unexpected private film source`);
      check(await video.getAttribute('controls') !== null, `${label}: film has no playback controls`);
      check(await video.getAttribute('autoplay') === null, `${label}: review film must not autoplay`);
      check(await video.locator('track[kind="captions"][srclang="en"]').count() === 1, `${label}: missing English captions`);
      check(/private review|not creatively approved/i.test(await page.locator('#film-status').innerText()), `${label}: private film lacks review status`);
      if (inspectMedia) await checkFilmMedia(page, video, label);
    }
  } else {
    check(await video.count() === 0, `${label}: default public page unexpectedly embeds a film`);
    check(await page.locator('#film .film-poster img').count() === 1, `${label}: public film placeholder missing`);
    if (inspectMedia) {
      const privateEndpoint = await page.request.head(`${baseURL}/review-media/founder-film.mp4`);
      check(privateEndpoint.status() === 404, `${label}: production serves the private review endpoint (HTTP ${privateEndpoint.status()})`);
      await privateEndpoint.dispose();
    }
  }
  // Exercise real keyboard behavior before scrolling/focusing image controls.
  await page.keyboard.press('Tab');
  check(await page.locator('.skip-link').evaluate((node) => node === document.activeElement), `${label}: first Tab must expose the skip link`);
  await page.keyboard.press('Enter');
  check(new URL(page.url()).hash === '#main', `${label}: skip link did not reach main`);
  const learnLink = page.locator('.site-header a[href="#learn"]');
  await learnLink.focus();
  await learnLink.press('Enter');
  check(new URL(page.url()).hash === '#learn', `${label}: keyboard Learn link failed`);
  const notesLink = page.locator('a[href="#field-notes"]').first();
  await notesLink.focus();
  await notesLink.press('Enter');
  check(new URL(page.url()).hash === '#field-notes', `${label}: keyboard field-notes link failed`);
  check(await page.locator('.dharmic-testimonial-card').count() === 9, `${label}: expected nine learner accounts`);
  check(await page.locator('.dharmic-case-card').count() === 4, `${label}: expected four case studies`);
  const archive = page.locator('details.evidence-archive');
  check(await archive.getAttribute('open') === null, `${label}: archive should start collapsed`);
  const summary = archive.locator('summary');
  await summary.focus();
  const focusStyle = await summary.evaluate((node) => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  check(focusStyle.style !== 'none' && focusStyle.width >= 2, `${label}: archive keyboard control needs visible focus`);
  await summary.press('Enter');
  check(await archive.getAttribute('open') !== null, `${label}: archive did not open with Enter`);
  check(await page.locator('.dharmic-testimonial-card:visible').count() === 9, `${label}: archive did not reveal all learner accounts`);
  check(await page.locator('.dharmic-case-card:visible').count() === 4, `${label}: archive did not reveal all cases`);
  const cases = await page.locator('.dharmic-case-card').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const caseURLs = ['seema', 'nick', 'martine', 'yves'].map((name) => `https://chaiwithjai.com/articles/${name}-case-study.html`);
  check(cases.length === 4 && caseURLs.every((url) => cases.includes(url)), `${label}: case study lost its published source link`);
  // Lazy images inside details need the archive opened first; cases are text links.
  for (const img of await page.locator('img:visible').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((node) => node.decode());
    check(await img.evaluate((node) => node.naturalWidth > 0), `${label}: image did not load: ${await img.getAttribute('src')}`);
  }
  if (reducedMotion === 'reduce') {
    check(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), `${label}: reduced motion still uses smooth scrolling`);
    const moving = await page.locator('body *').evaluateAll((nodes) => nodes.filter((node) => {
      const style = getComputedStyle(node);
      // Non-rendering media metadata nodes (source/track) return an empty
      // animationName, which does not represent visible motion.
      return node.getClientRects().length > 0 && (
        style.animationName.split(',').some((name) => name.trim() && name.trim() !== 'none')
        || style.transitionDuration.split(',').some((value) => parseFloat(value) > 0)
      );
    }).length);
    check(moving === 0, `${label}: ${moving} elements retain motion under reduced-motion preference`);
  }
}

async function checkLegacyMenu(page, label) {
  const menu = page.locator('.menu-button');
  const panel = page.locator('.menu-wrapper');
  await menu.click();
  check(await menu.getAttribute('aria-expanded') === 'true' && await panel.isVisible(), `${label}: mobile menu failed to open`);
  await menu.click();
  check(await menu.getAttribute('aria-expanded') === 'false' && !await panel.isVisible(), `${label}: mobile menu failed to close`);
  await menu.press('Enter');
  check(await menu.getAttribute('aria-expanded') === 'true' && await panel.isVisible(), `${label}: mobile menu failed with Enter`);
  await page.keyboard.press('Escape');
  check(await menu.getAttribute('aria-expanded') === 'false' && !await panel.isVisible(), `${label}: mobile menu failed to close with Escape`);
  check(await menu.evaluate((node) => node === document.activeElement), `${label}: menu did not restore focus`);
}

async function checkShop(page, label, route, width) {
  const expected = ['/shop/', '/shop/atlas/', '/shop/mission/', '/shop/about/', '/shop/ecosystem/'];
  const links = await page.locator('#shop-nav a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
  check(JSON.stringify(links) === JSON.stringify(expected), `${label}: storefront navigation changed`);
  if (width === 390) {
    const menu = page.locator('.menu-toggle');
    await menu.focus();
    await menu.press('Enter');
    check(await menu.getAttribute('aria-expanded') === 'true' && await page.locator('#shop-nav').isVisible(), `${label}: shop keyboard menu failed to open`);
    await menu.press('Enter');
    check(await menu.getAttribute('aria-expanded') === 'false', `${label}: shop keyboard menu failed to close`);
  }
  if (route === '/shop') {
    const medium = page.locator('[data-size="M"]');
    check(await medium.count() === 1, `${label}: expected one medium size control`);
    await medium.click();
    check(await medium.getAttribute('aria-pressed') === 'true', `${label}: size selection state did not update`);
    check((await page.locator('.buy-button').getAttribute('href'))?.includes('Preferred%20size%3A%20M'), `${label}: selected size was not carried into drop action`);
  }
}

async function verify(route, heading, width, height, name, reducedMotion = 'no-preference') {
  const label = `${route} at ${width}px`;
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => failures.push(`${label}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`${label}: console error: ${message.text()}`); });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('/.wf_graphql/csrf')) failures.push(`${label}: HTTP ${response.status()} for ${response.url()}`);
  });
  try {
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    check(response?.ok(), `${label}: HTTP ${response?.status()}`);
    check(normalize(await page.locator('h1').first().innerText()).toLowerCase().includes(heading.toLowerCase()), `${label}: missing heading ${heading}`);
    if (route === '/') {
      if (width === 1440 || width === 390) {
        await page.screenshot({ path: `${output}/home-hero-${width === 1440 ? 'desktop' : 'mobile'}.png` });
      }
      await checkHome(page, label, reducedMotion, width === 1440);
      if (width === 1440) {
        await page.locator('#film').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: `${output}/home-film-context-desktop.png` });
      }
      if (width === 390) {
        await page.locator('.lessons-heading').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: `${output}/home-maven-mobile.png` });
      }
    }
    if (route === '/vlog' && width === 390) await checkLegacyMenu(page, label);
    if (route.startsWith('/shop')) await checkShop(page, label, route, width);
    check(!await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), `${label}: horizontal overflow`);
    const smallTargets = await page.locator('.nav-link:visible, .footer-informations a:visible, .site-header nav a:visible, .site-footer > div a:visible').evaluateAll((nodes) => nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).map((node) => `${node.textContent?.trim()}: ${Math.round(node.getBoundingClientRect().width)}x${Math.round(node.getBoundingClientRect().height)}`));
    check(!smallTargets.length, `${label}: undersized navigation targets ${smallTargets.join(', ')}`);
    const unnamed = await page.locator('a:visible').evaluateAll((nodes) => nodes.filter((node) => !node.textContent?.trim() && !node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby') && !node.querySelector('img[alt]')).length);
    check(!unnamed, `${label}: ${unnamed} visible links have no accessible name`);
    await page.screenshot({ path: `${output}/${name}`, fullPage: true });
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    await page.screenshot({ path: `${output}/failed-${name}`, fullPage: true }).catch(() => {});
  } finally {
    await context.close();
  }
}

try {
  if (filmExpected && !process.env.BASE_URL) throw new Error('Private film checks require an explicit BASE_URL for the dev server');
  const renderedCount = checkBuild();
  if (!process.env.BASE_URL) {
    preview = spawn('node_modules/.bin/astro', ['preview', '--host', '127.0.0.1', '--port', '4325'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let startupOutput = '';
    let startupError;
    preview.stdout.on('data', (chunk) => { startupOutput = (startupOutput + chunk).slice(-2000); });
    preview.stderr.on('data', (chunk) => { startupOutput = (startupOutput + chunk).slice(-2000); });
    preview.once('error', (error) => { startupError = error; });
    let ready = false;
    let readinessDetail = '';
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (startupError) throw startupError;
      if (preview.exitCode !== null) throw new Error(`Preview exited with ${preview.exitCode}: ${startupOutput}`);
      try {
        const response = await fetch(baseURL, { signal: AbortSignal.timeout(1500) });
        readinessDetail = `HTTP ${response.status}`;
        if (response.ok) { ready = true; break; }
      } catch (error) { readinessDetail = `${error.message}: ${error.cause?.code || ''}`; }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error(`Preview did not start at ${baseURL}: ${readinessDetail}\n${startupOutput}`);
  }
  browser = await chromium.launch({ ...(fs.existsSync(localChrome) ? { executablePath: localChrome } : {}), headless: true });
  for (const [width, height, name] of [[320, 760, 'home-320.png'], [390, 844, 'home-mobile.png'], [768, 1024, 'home-tablet.png'], [1440, 1000, 'home-desktop.png']]) {
    await verify('/', homeHeading, width, height, name, width <= 390 ? 'reduce' : 'no-preference');
  }
  await verify('/about', 'I won an NVIDIA hackathon with friends.', 1440, 1000, 'about-desktop.png');
  await verify('/about', 'I won an NVIDIA hackathon with friends.', 390, 844, 'about-mobile.png', 'reduce');
  await verify('/vlog', 'Build Stories', 1440, 1000, 'vlog-desktop.png');
  await verify('/vlog', 'Build Stories', 390, 844, 'vlog-mobile.png', 'reduce');
  await verify('/vlog/how-we-built-shakti', 'How we built Shakti', 390, 844, 'episode-mobile.png');
  await verify('/shop', 'Pied-à-Pierre', 1440, 1000, 'shop-desktop.png');
  await verify('/shop', 'Pied-à-Pierre', 390, 844, 'shop-mobile.png', 'reduce');
  for (const [route, heading, name] of [
    ['atlas', 'A shirt you can keep opening.', 'atlas'], ['mission', 'Culture is data with a pulse.', 'mission'],
    ['about', 'Built from a life of translation.', 'people'], ['ecosystem', 'One method. Different objects.', 'system'],
  ]) await verify(`/shop/${route}`, heading, 1440, 1000, `shop-${name}-desktop.png`);
  successMessage = `Dharmic checks passed: ${renderedCount} built routes; homepage at 320/390/768/1440px; ${filmExpected ? 'private review film' : 'public film placeholder'}; keyboard, learner evidence, Maven, vlog and shop.`;
} catch (error) {
  failures.push(error.message);
} finally {
  await browser?.close().catch((error) => failures.push(`Browser cleanup: ${error.message}`));
  if (preview?.pid && preview.exitCode === null && !preview.signalCode) {
    // Stop only the preview process this test created. Bound its graceful
    // shutdown; do not leave an Astro child keeping npm alive after PASS.
    const stopped = new Promise((resolve) => preview.once('close', resolve));
    preview.kill('SIGTERM');
    const forceStop = setTimeout(() => preview.kill('SIGKILL'), 5000);
    await stopped;
    clearTimeout(forceStop);
  }
}
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else if (successMessage) {
  console.log(successMessage);
}
