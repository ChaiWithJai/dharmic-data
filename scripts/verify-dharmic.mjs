import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const ownsPreview = !process.env.BASE_URL;
const previewPort = 41000 + (process.pid % 10000);
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${previewPort}`;
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDirectory = 'output/dharmic-qa';
fs.mkdirSync(outputDirectory, { recursive: true });

let preview;
if (ownsPreview) {
  preview = spawn('./node_modules/.bin/astro', ['preview', '--host', '127.0.0.1', '--port', String(previewPort)], { stdio: 'inherit' });
  let previewReady = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        previewReady = true;
        break;
      }
    } catch {}
    if (preview.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!previewReady) {
    preview.kill('SIGTERM');
    throw new Error(`Astro preview did not become ready at ${baseURL} within 60 seconds.`);
  }
}

const launchOptions = fs.existsSync(chromePath) ? { executablePath: chromePath, headless: true } : { headless: true };
const browser = await chromium.launch(launchOptions);
const errors = [];

async function checkPage(path, expectedHeading, viewport, screenshotName, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${path}: console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${path}: page error: ${error.message}`));

  const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) errors.push(`${path}: returned ${response?.status()}`);
  const heading = await page.locator('h1').first().textContent();
  if (!heading?.replace(/\s+/g, ' ').includes(expectedHeading)) errors.push(`${path}: expected heading ${expectedHeading}, got ${heading}`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) errors.push(`${path}: horizontal overflow at ${viewport.width}px`);

  const unlabeledLinks = await page.locator('a').evaluateAll((links) => links.filter((link) => !link.textContent?.trim() && !link.getAttribute('aria-label')).length);
  if (unlabeledLinks) errors.push(`${path}: ${unlabeledLinks} links have no accessible name`);

  const targetSizes = await page.locator('header a:visible').evaluateAll((links) => links.map((link) => {
    const rect = link.getBoundingClientRect();
    return { text: link.textContent?.trim(), width: rect.width, height: rect.height };
  }));
  for (const target of targetSizes) {
    if (target.width < 44 || target.height < 44) errors.push(`${path}: header target ${target.text} is ${Math.round(target.width)} by ${Math.round(target.height)}`);
  }

  await page.screenshot({ path: `${outputDirectory}/${screenshotName}`, fullPage: true });
  await context.close();
}

await checkPage('/', 'Build something useful and show how it works.', { width: 1440, height: 1000 }, 'home-desktop.png');
await checkPage('/', 'Build something useful and show how it works.', { width: 390, height: 844 }, 'home-mobile.png', 'reduce');
await checkPage('/vlog', 'What we built, and what we learned.', { width: 1024, height: 900 }, 'vlog-desktop.png');
await checkPage('/vlog/building-shakti-with-public-data', 'How we built a civic data demo without putting AI in the critical path', { width: 390, height: 844 }, 'article-mobile.png');

await browser.close();
if (preview) preview.kill('SIGTERM');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Dharmic Data browser checks passed at 390px, 1024px, and 1440px.');
