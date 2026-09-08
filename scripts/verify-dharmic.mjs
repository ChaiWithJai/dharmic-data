import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Default: built production site. Private review:
// BASE_URL=http://127.0.0.1:4327 REVIEW_FILM_EXPECTED=1 npm run verify:dharmic
// Pin a separately approved field-notes URL with MAVEN_GUIDE_EXPECTED_URL.
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4325';
const filmExpected = process.env.REVIEW_FILM_EXPECTED === '1';
const output = filmExpected ? 'output/template-restoration/qa/private-review' : 'output/template-restoration/qa';
const buildDir = process.env.BUILD_DIR || 'dist';
const templateRoutes = ['/', '/school', '/about', '/learn'];
const diagnostics = [];
const selectedRoutes = process.env.QA_ROUTES?.split(',').map((route) => route.trim()).filter(Boolean);
const selectedWidths = process.env.QA_WIDTHS?.split(',').map(Number);
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
  const rendered = filesUnder(buildDir).filter((file) => file.endsWith('.html'));
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
  for (const root of ['src/pages', buildDir]) for (const file of filesUnder(root).filter((file) => /\.(astro|html)$/.test(file))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const pattern of placeholders) check(!pattern.test(source), `${root}/${file}: leftover ${pattern}`);
  }
  if (!filmExpected) {
    for (const route of templateRoutes) {
      const file = route === '/' ? path.join(buildDir, 'index.html') : path.join(buildDir, route.slice(1), 'index.html');
      if (fs.existsSync(file)) check(!fs.readFileSync(file, 'utf8').includes('/review-media/'), `${route}: production build exposes the private film endpoint`);
    }
    check(!filesUnder(buildDir).some((file) => file.startsWith('review-media/')), 'production build contains private review media');
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

async function checkTemplate(page, label, route, reducedMotion) {
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  check(styles.includes('/assets/webflow-bundle/c36a0562fb6b95e9.css'), `${label}: original template CSS is absent`);
  check(!styles.some((href) => href === '/school.css' || /Caslon/i.test(href)), `${label}: replacement editorial stylesheet is still loaded`);
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => {
    const heading = []; const walker = document.createTreeWalker(document.querySelector('h1'), NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent.trim()) heading.push(getComputedStyle(node.parentElement).fontFamily);
    return { heading: [...new Set(heading)], body: getComputedStyle(document.body).fontFamily };
  });
  check(fonts.heading.length > 0 && fonts.heading.every((font) => /Fredoka/i.test(font)), `${label}: original Fredoka rendered headline font missing (${fonts.heading})`);
  check(/Inter/i.test(fonts.body), `${label}: original Inter body font missing (${fonts.body})`);
  const links = await page.locator('nav[aria-label="Main navigation"] a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
  check(JSON.stringify(links) === JSON.stringify(templateRoutes), `${label}: shared four-page navigation changed: ${links}`);
  const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')).filter((href) => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1)))));
  check(!brokenAnchors.length, `${label}: broken local anchors ${brokenAnchors.join(', ')}`);
  check(await page.locator('input[type="email"], form').count() === 0, `${label}: unexpected local signup form; signup belongs on Maven`);
  const headerClearance = await page.evaluate(() => {
    const header = document.querySelector('.navbar');
    const firstText = document.querySelector('main p, main h1');
    return !header || !firstText || firstText.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1;
  });
  check(headerClearance, `${label}: first content text overlaps the fixed header`);
  await page.keyboard.press('Tab');
  check(await page.locator('.dharmic-skip').evaluate((node) => node === document.activeElement), `${label}: first Tab must expose the skip link`);
  await page.keyboard.press('Enter');
  check(new URL(page.url()).hash === '#main', `${label}: skip link did not reach main`);
  if (reducedMotion === 'reduce') {
    check(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), `${label}: reduced motion still uses smooth scrolling`);
    const activeRive = await page.locator('[data-animation-type="rive"]').evaluateAll((nodes) => nodes.filter((node) => {
      const canvas = node.querySelector('canvas');
      const visible = canvas && canvas.getBoundingClientRect().width > 0 && getComputedStyle(canvas).display !== 'none' && getComputedStyle(canvas).visibility !== 'hidden' && getComputedStyle(node).display !== 'none';
      const rive = window.Webflow?.require?.('rive')?.getInstance(node)?.rive;
      return visible && rive?.isPlaying;
    }).length);
    check(activeRive === 0, `${label}: ${activeRive} visible Rive animations play with reduced motion`);
  }
}

async function checkRive(page, label) {
  const targets = page.locator('[data-animation-type="rive"]');
  check(await targets.count() >= 2, `${label}: original hero/footer Rive characters missing`);
  for (const target of await targets.all()) {
    if (!await target.isVisible()) continue;
    await target.scrollIntoViewIfNeeded();
    await target.evaluate((node) => new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      const observe = () => {
        const rive = window.Webflow?.require?.('rive')?.getInstance(node)?.rive;
        if (rive?.loaded && rive?.isPlaying) return resolve(true);
        if (Date.now() > deadline) return reject(new Error(`Rive did not load and play: ${node.getAttribute('data-rive-url')}`));
        requestAnimationFrame(observe);
      };
      observe();
    }));
    const painted = await target.evaluate(async (node) => {
      const canvas = node.querySelector('canvas');
      // Read the rendered canvas through a temporary 2D surface; this works
      // with both the template's offscreen renderer and regular 2D canvases.
      const sample = () => {
        const surface = document.createElement('canvas'); surface.width = 64; surface.height = 64;
        const context = surface.getContext('2d'); context.drawImage(canvas, 0, 0, 64, 64);
        const pixels = context.getImageData(0, 0, 64, 64).data;
        let alpha = 0; let hash = 2166136261; const colors = new Set();
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 0) { alpha += 1; colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`); }
          hash = Math.imul(hash ^ pixels[i] ^ (pixels[i+1] << 8) ^ (pixels[i+2] << 16) ^ pixels[i+3], 16777619);
        }
        return { alpha, colors: colors.size, hash: hash >>> 0 };
      };
      await new Promise(requestAnimationFrame);
      const first = sample();
      // Observe actual rendered frames, not a timer-only or CSS declaration check.
      const hashes = new Set([first.hash]);
      for (let frame = 0; frame < 30; frame += 1) { await new Promise(requestAnimationFrame); hashes.add(sample().hash); }
      const rive = window.Webflow.require('rive').getInstance(node).rive;
      return { url: node.getAttribute('data-rive-url'), loaded: rive.loaded, playing: rive.isPlaying, width: canvas.width, height: canvas.height, first, distinctFrames: hashes.size };
    });
    diagnostics.push({ label, rive: painted });
    check(painted.loaded && painted.playing && painted.width > 0 && painted.height > 0 && painted.first.alpha > 10 && painted.first.colors > 2, `${label}: Rive has no actual painted character: ${JSON.stringify(painted)}`);
    check(painted.distinctFrames > 1, `${label}: Rive claims playback but rendered pixels do not move: ${painted.url}`);
  }
}

async function checkHome(page, label, reducedMotion, inspectMedia) {
  check(normalize(await page.locator('h1').first().innerText()) === homeHeading, `${label}: teacher headline changed`);
  check(await page.locator('section.home-hero').count() === 1 && await page.locator('.home-rive').count() === 1, `${label}: original hero/character structure missing`);
  check(await page.locator('.home-hero .sticker, .home-hero [class*="pill"], .home-hero .hero-text.green, .home-hero .hero-text.orange, .home-hero .hero-text.purple, .home-hero .hero-text.yellow, .home-hero .cta-title.digital, .home-hero .cta-title.partner').count() > 0, `${label}: original colored headline treatments missing`);
  check(await page.locator('.pill-drops .about-pill').count() === 11, `${label}: original falling-pill composition must retain eleven labels`);
  check(await page.locator('#film, video').count() === 0, `${label}: supporting film must live on About, not the homepage`);
  for (const route of ['/school', '/about', '/learn']) check(await page.locator(`main a[href="${route}"]`).count() > 0, `${label}: homepage does not lead into ${route}`);
  if (inspectMedia && reducedMotion === 'no-preference') await checkRive(page, label);
}

async function checkSchool(page, label) {
  const text = normalize(await page.locator('main').innerText());
  for (const topic of [/Homer/i, /Conscious Compute/i, /paid/i, /premium/i]) check(topic.test(text), `${label}: school is missing ${topic}`);
  check(await page.locator('main a[href="https://literature.dharmicdata.org"]').count() > 0, `${label}: Homer does not connect to the working literature site`);
  check(await page.locator('#film, video').count() === 0, `${label}: supporting film leaked into the school page`);
}

async function checkAbout(page, label, inspectMedia) {
  const text = normalize(await page.locator('main').innerText());
  for (const topic of [/NVIDIA/, /concept/i, /inspiration/i, /significance/i]) check(topic.test(text), `${label}: founder/film context is missing ${topic}`);
  const video = page.locator('#film video');
  check(await page.locator('#film').count() === 1, `${label}: About must own the film`);
  if (filmExpected) {
    check(await video.count() === 1, `${label}: private review video missing`);
    if (await video.count()) {
      check(await video.locator('source').getAttribute('src') === '/review-media/founder-film.mp4', `${label}: unexpected private film source`);
      check(await video.getAttribute('controls') !== null, `${label}: film has no playback controls`);
      check(await video.getAttribute('autoplay') === null, `${label}: review film must not autoplay`);
      check(await video.locator('track[kind="captions"][srclang="en"]').count() === 1, `${label}: missing English captions`);
      check(/private review|not creatively approved/i.test(await page.locator('#film').innerText()), `${label}: private film lacks review status`);
      if (inspectMedia) await checkFilmMedia(page, video, label);
    }
  } else {
    check(await video.count() === 0, `${label}: default public page unexpectedly embeds an unapproved film`);
    check(await page.locator('#film img').count() >= 1, `${label}: public film holding poster missing`);
    if (inspectMedia) {
      const privateEndpoint = await page.request.head(`${baseURL}/review-media/founder-film.mp4`);
      check(privateEndpoint.status() === 404, `${label}: production serves the private review endpoint (HTTP ${privateEndpoint.status()})`);
      await privateEndpoint.dispose();
    }
  }
}

async function checkLearn(page, label) {
  const actualLessons = await page.locator('.lesson-link').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  check(JSON.stringify(actualLessons) === JSON.stringify(lessonURLs), `${label}: Lightning Lessons must use the two verified Maven pages`);
  check(await page.locator('.notes-cta').getAttribute('href') === guideURL, `${label}: field-notes destination differs from the pinned Maven destination`);
  const mavenLinks = await page.locator('a[href*="maven"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const allowedMaven = new Set([schoolURL, ...lessonURLs, guideURL]);
  for (const href of mavenLinks) {
    const url = new URL(href);
    check(url.protocol === 'https:' && url.hostname === 'maven.com' && !url.username && !url.password && !url.port && allowedMaven.has(href), `${label}: unverified Maven link ${href}`);
  }
  const staleLessons = await page.locator('[data-lesson-ends]').evaluateAll((lessons) => lessons.filter((lesson) => lesson.dataset.lessonPhase !== (Date.now() >= Date.parse(lesson.dataset.lessonEnds) ? 'past' : 'scheduled')).length);
  check(staleLessons === 0, `${label}: lesson availability has not followed the actual date`);
  check(await page.locator('.dharmic-testimonial-card').count() === 9, `${label}: expected nine learner accounts`);
  check(await page.locator('.dharmic-case-card').count() === 4, `${label}: expected four case studies`);
  const archive = page.locator('details.evidence-archive');
  check(await archive.getAttribute('open') === null, `${label}: archive should start collapsed`);
  const summary = archive.locator('summary');
  await summary.focus();
  const focus = await summary.evaluate((node) => ({ style: getComputedStyle(node).outlineStyle, width: parseFloat(getComputedStyle(node).outlineWidth) }));
  check(focus.style !== 'none' && focus.width >= 2, `${label}: archive keyboard control needs visible focus`);
  await summary.press('Enter');
  check(await archive.getAttribute('open') !== null, `${label}: archive did not open with Enter`);
  check(await page.locator('.dharmic-testimonial-card:visible').count() === 9, `${label}: archive did not reveal all learner accounts`);
  check(await page.locator('.dharmic-case-card:visible').count() === 4, `${label}: archive did not reveal all cases`);
  const cases = await page.locator('.dharmic-case-card').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  for (const name of ['seema', 'nick', 'martine', 'yves']) check(cases.includes(`https://chaiwithjai.com/articles/${name}-case-study.html`), `${label}: case study ${name} lost its published source link`);
}

async function checkTextBounds(page, label) {
  const outside = await page.locator('main h1, main h2, main h3, main p, main summary').evaluateAll((nodes) => {
    const width = document.documentElement.clientWidth;
    const failures = [];
    for (const node of nodes) {
      if (!node.getClientRects().length || getComputedStyle(node).visibility === 'hidden') continue;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        if (!text.textContent.trim() || text.parentElement.closest('[aria-hidden="true"]')) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        for (const rect of range.getClientRects()) {
          if (rect.width > 1 && rect.height > 1 && (rect.left < -2 || rect.right > width + 2)) failures.push(`${text.textContent.trim().slice(0, 70)}: ${Math.round(rect.left)}..${Math.round(rect.right)}`);
        }
      }
    }
    return [...new Set(failures)];
  });
  if (outside.length) diagnostics.push({ label, textBounds: outside, scrollState: await page.evaluate(() => ({ x: scrollX, scrolledContainers: [...document.querySelectorAll('main *')].filter((node) => node.scrollLeft).map((node) => ({ class: node.className, scrollLeft: node.scrollLeft, overflow: getComputedStyle(node).overflow, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth })) })) });
  check(!outside.length, `${label}: visible text extends outside viewport: ${outside.join('; ')}`);
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
  if (selectedRoutes && !selectedRoutes.includes(route)) return;
  if (selectedWidths && !selectedWidths.includes(width)) return;
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
    if (templateRoutes.includes(route)) {
      await checkTemplate(page, label, route, reducedMotion);
      if (width <= 768) await checkLegacyMenu(page, label);
      if (route === '/') await checkHome(page, label, reducedMotion, width === 1440);
      if (route === '/school') await checkSchool(page, label);
      if (route === '/about') await checkAbout(page, label, width === 1440);
      if (route === '/learn') await checkLearn(page, label);
      for (const img of await page.locator('img:visible').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate((node) => node.decode());
        check(await img.evaluate((node) => node.naturalWidth > 0), `${label}: image did not load: ${await img.getAttribute('src')}`);
      }
      await checkTextBounds(page, label);
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      if (route === '/') await page.waitForFunction(() => [...document.querySelectorAll('.hero-para,.home-hero .button-text._01')].every((node) => {
        const rect = node.getBoundingClientRect();
        for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) if (+getComputedStyle(ancestor).opacity < .95 || getComputedStyle(ancestor).visibility === 'hidden') return false;
        return rect.width > 0 && rect.height > 0;
      }), null, { timeout: 3000 });
      if (width === 1440 || width === 390) await page.screenshot({ path: `${output}/${route === '/' ? 'home' : route.slice(1)}-first-screen-${width}.png` });
      if (route === '/about' && width === 1440) {
        await page.locator('#film').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: `${output}/about-film-context-desktop.png` });
      }
      if (route === '/learn' && width === 390) {
        await page.locator('#field-notes').evaluate((node) => node.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: `${output}/learn-field-notes-mobile.png` });
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
  for (const [route, heading, name] of [
    ['/', homeHeading, 'home'], ['/school', '', 'school'], ['/about', 'I won an NVIDIA hackathon with friends.', 'about'], ['/learn', '', 'learn'],
  ]) for (const [width, height] of [[320, 760], [390, 844], [768, 1024], [1440, 1000]]) {
    await verify(route, heading, width, height, `${name}-${width}.png`, width <= 390 ? 'reduce' : 'no-preference');
  }
  await verify('/vlog', 'Build Stories', 1440, 1000, 'vlog-desktop.png');
  await verify('/vlog', 'Build Stories', 390, 844, 'vlog-mobile.png', 'reduce');
  await verify('/vlog/how-we-built-shakti', 'How we built Shakti', 390, 844, 'episode-mobile.png');
  await verify('/shop', 'Pied-à-Pierre', 1440, 1000, 'shop-desktop.png');
  await verify('/shop', 'Pied-à-Pierre', 390, 844, 'shop-mobile.png', 'reduce');
  for (const [route, heading, name] of [
    ['atlas', 'A shirt you can keep opening.', 'atlas'], ['mission', 'Culture is data with a pulse.', 'mission'],
    ['about', 'Built from a life of translation.', 'people'], ['ecosystem', 'One method. Different objects.', 'system'],
  ]) await verify(`/shop/${route}`, heading, 1440, 1000, `shop-${name}-desktop.png`);
  successMessage = selectedRoutes || selectedWidths
    ? `Targeted Dharmic checks passed: routes ${selectedRoutes?.join(', ') || 'all'}; widths ${selectedWidths?.join(', ') || 'all configured'}; ${renderedCount} built routes verified.`
    : `Dharmic checks passed: ${renderedCount} built routes; four template pages at 320/390/768/1440px; original fonts, painted moving Rive characters, real text bounds, keyboard navigation, ${filmExpected ? 'private review film' : 'public film placeholder'} on About; learner evidence, Maven, vlog and shop.`;
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
fs.writeFileSync(`${output}/${selectedRoutes || selectedWidths ? 'verification-targeted' : 'verification'}.json`, JSON.stringify({ baseURL, filmExpected, selectedRoutes, selectedWidths, checkedAt: new Date().toISOString(), failures: [...new Set(failures)], diagnostics, success: failures.length === 0 }, null, 2));
if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exitCode = 1;
} else if (successMessage) {
  console.log(successMessage);
}
