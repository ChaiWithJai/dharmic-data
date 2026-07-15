import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4325';
const output = 'output/browser-qa';
fs.mkdirSync(output, { recursive: true });
const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const preview = process.env.BASE_URL ? null : spawn(
  'node_modules/.bin/astro',
  ['preview', '--host', '127.0.0.1', '--port', '4325'],
  { stdio: 'ignore' },
);

if (preview) {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error(`Preview did not start at ${baseURL}`);
}

const browser = await chromium.launch({
  ...(fs.existsSync(localChrome) ? { executablePath: localChrome } : {}),
  headless: true,
});
const failures = [];
const blocked = [
  /facebook\.com/i, /x\.com/i, /linkedin\.com/i, /social-box/i,
  /nexia-agency/i, /webflow\.com/i, /w-commerce/i, /REPLACE_/,
  /Pricing Details/i, /\/pricing\b/i, /\/checkout\b/i,
  /\/blog-posts\//i, /A\+ Active/i,
  /impactful digital products/i, /business grow in the digital world/i,
  /Mobile App Development/i, /social media platforms/i,
];

function scanHtml(root) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) scanHtml(file);
    else if (file.endsWith('.astro') || file.endsWith('.html')) {
      const source = fs.readFileSync(file, 'utf8');
      for (const pattern of blocked) if (pattern.test(source)) failures.push(`${file}: blocked pattern ${pattern}`);
    }
  }
}

scanHtml('src/pages');
scanHtml('dist');

const renderedRoutes = fs.readdirSync('dist', { recursive: true })
  .filter((file) => String(file).endsWith('.html'));
if (renderedRoutes.length !== 4) failures.push(`expected 4 rendered routes, found ${renderedRoutes.length}`);

async function verify(path, heading, width, height, name, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`${path}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${path}: console error: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('/.wf_graphql/csrf')) failures.push(`${path}: HTTP ${response.status()} for ${response.url()}`);
  });
  const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) failures.push(`${path}: HTTP ${response?.status()}`);
  const title = (await page.locator('h1').allTextContents()).join(' ').replace(/\s+/g, ' ');
  if (!title.includes(heading)) failures.push(`${path}: missing heading ${heading}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (overflow) failures.push(`${path}: horizontal overflow at ${width}px`);
  if (path === '/' && width === 1440) {
    const riveState = await page.locator('.home-rive, .idea-rive, .footer-rive.desk').evaluateAll((nodes) => nodes.map((node) => ({
      url: node.getAttribute('data-rive-url'),
      type: node.getAttribute('data-animation-type'),
      canvasDisplay: getComputedStyle(node.querySelector('canvas')).display,
    })));
    if (riveState.length !== 3 || riveState.some((item) => !item.url || item.type !== 'rive' || item.canvasDisplay === 'none')) {
      failures.push(`${path}: original Rive animations are not configured and visible: ${JSON.stringify(riveState)}`);
    }
  }
  if (path === '/' && width === 390) {
    const menu = page.getByRole('button', { name: /menu/i });
    await menu.click();
    await page.waitForFunction(
      () => document.querySelector('.w-nav-button')?.getAttribute('aria-expanded') === 'true',
      null,
      { timeout: 1500 },
    ).catch(() => {});
    const expanded = await menu.getAttribute('aria-expanded');
    const vlogLink = page.locator('nav[data-nav-menu-open] a[href="/vlog"]');
    const menuLinks = await vlogLink.count();
    const menuLinkVisible = menuLinks === 1 && await vlogLink.isVisible();
    if (expanded !== 'true' || !menuLinkVisible) failures.push(`${path}: mobile menu did not expose the primary links (expanded=${expanded}, links=${menuLinks}, visible=${menuLinkVisible})`);
    await menu.click();
    if (await menu.getAttribute('aria-expanded') !== 'false' || await vlogLink.isVisible()) failures.push(`${path}: mobile menu did not close on second click`);
    await menu.press('Enter');
    if (await menu.getAttribute('aria-expanded') !== 'true' || !await vlogLink.isVisible()) failures.push(`${path}: mobile menu did not open with Enter`);
    await page.keyboard.press('Escape');
    if (await menu.getAttribute('aria-expanded') !== 'false' || await vlogLink.isVisible()) failures.push(`${path}: mobile menu did not close on Escape`);
  }
  const fragmentedHeadings = await page.locator('h2').evaluateAll((nodes) => nodes.filter((node) => node.textContent?.trim().split(/\s+/).length === 1 && !node.classList.contains('sr-only')).map((node) => node.textContent?.trim()));
  if (fragmentedHeadings.length > 3) failures.push(`${path}: fragmented heading outline: ${fragmentedHeadings.join(', ')}`);
  const undersizedNavTargets = await page.locator('.nav-link:visible, .footer-informations a:visible').evaluateAll((nodes) => nodes.filter((node) => { const rect = node.getBoundingClientRect(); return rect.width < 44 || rect.height < 44; }).map((node) => `${node.textContent?.trim()}:${Math.round(node.getBoundingClientRect().width)}x${Math.round(node.getBoundingClientRect().height)}`));
  if (undersizedNavTargets.length) failures.push(`${path}: undersized navigation targets: ${undersizedNavTargets.join(', ')}`);
  const unlabeled = await page.locator('a:visible').evaluateAll((nodes) => nodes.filter((node) => !node.textContent?.trim() && !node.getAttribute('aria-label') && !node.querySelector('img[alt]')).length);
  if (unlabeled) failures.push(`${path}: ${unlabeled} visible links have no accessible name`);
  await page.screenshot({ path: `${output}/${name}`, fullPage: true });
  await context.close();
}

await verify('/', 'Find The AI Project Worth Building', 1440, 1000, 'home-desktop.png');
await verify('/', 'Find The AI Project Worth Building', 390, 844, 'home-mobile.png', 'reduce');
await verify('/vlog', 'Build Stories', 1440, 1000, 'vlog-desktop.png');
await verify('/vlog/how-we-built-shakti', 'How we built Shakti', 390, 844, 'episode-mobile.png');

await browser.close();
preview?.kill('SIGTERM');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Dharmic browser checks passed at 390px and 1440px.');
