import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer, { type Page } from 'puppeteer';

type OutputFormat = 'grouped' | 'history';

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isImageUrl(value: string): boolean {
  try {
    return /\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

function getAssetName(url: string): string {
  const filename = path.posix.basename(new URL(url).pathname);
  return filename.replace(/[<>:"|?*]/g, '_');
}

function getAssetKey(filename: string): string {
  return filename.replace(/\.[a-f0-9]{6,10}(?=\.[^.]+$)/i, '').replace(/\.[^.]+$/, '');
}

async function collectOperatorImageUrls(page: Page): Promise<string[]> {
  const urls = await page.evaluate(() => {
    const found = new Set<string>();
    const elements = document.querySelectorAll('[class*="Operator_"]');

    for (const element of elements) {
      if (element instanceof HTMLImageElement && element.currentSrc) found.add(element.currentSrc);

      const background = getComputedStyle(element).backgroundImage;
      for (const match of background.matchAll(/url\(["']?(.*?)["']?\)/g)) {
        if (match[1]) found.add(match[1]);
      }
    }

    return [...found];
  });

  return urls.filter(isImageUrl);
}

async function downloadImage(url: string, destination: string): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      if (attempt === 4) {
        throw new Error(`Failed to download ${url} after ${attempt} attempts`, { cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

export async function downloadOperatorAssets(outputPath: string, format: OutputFormat): Promise<void> {
  const outputDir = path.dirname(outputPath);
  const assetDir = path.join(outputDir, 'operator-assets');
  await fs.mkdir(assetDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60_000);
    await page.goto('https://endfield.gryphline.com/th-th#operator', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[class*="Operator_"]', { timeout: 30_000 });

    await page.evaluate(() => {
      document.querySelector('svg[data-key="operator"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('[class*="Operator_sectionContainer"]')?.scrollIntoView({ block: 'start' });
    });
    await delay(1000);

    const characterKeys = await page.$$eval('[class*="Operator_image"][data-key]', (elements) =>
      elements.map((element) => element.getAttribute('data-key')).filter((key): key is string => Boolean(key)),
    );
    const urls = new Set(await collectOperatorImageUrls(page));

    for (const key of characterKeys) {
      await page.evaluate((characterKey) => {
        document
          .querySelector(`[class*="Operator_image"][data-key="${CSS.escape(characterKey)}"]`)
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }, key);
      await page.waitForFunction(
        (characterKey) =>
          document.querySelector('[class*="Operator_illustration"][data-key]')?.getAttribute('data-key') ===
          characterKey,
        { timeout: 10_000 },
        key,
      );
      for (const url of await collectOperatorImageUrls(page)) urls.add(url);
    }

    if (urls.size === 0) throw new Error('No operator images were found on the page');

    const urlList = [...urls].sort((a, b) => a.localeCompare(b));
    const groups = new Map<string, { url: string; filename: string }[]>();
    for (const url of urlList) {
      const filename = getAssetName(url);
      const key = getAssetKey(filename);
      const entries = groups.get(key) ?? [];
      entries.push({ url, filename });
      groups.set(key, entries);
    }

    let downloaded = 0;
    for (let i = 0; i < urlList.length; i += 4) {
      await Promise.all(
        urlList.slice(i, i + 4).map(async (url) => {
          const destination = path.join(assetDir, getAssetName(url));
          try {
            await fs.access(destination);
          } catch {
            await downloadImage(url, destination);
            downloaded++;
          }
        }),
      );
    }

    const updatedAt = new Date().toISOString();
    if (format === 'grouped') {
      const assets = Object.fromEntries(
        [...groups].map(([key, entries]) => [
          key.toLowerCase().replace(/\s+/g, '_'),
          {
            type: 'character',
            versions: entries.map((entry) => entry.url),
            files: entries.map((entry) => path.join('operator-assets', entry.filename)),
          },
        ]),
      );
      await fs.writeFile(
        outputPath,
        JSON.stringify({ updatedAt, totalGroups: Object.keys(assets).length, assets }, null, 2),
      );
    } else {
      const rsp = Object.fromEntries([...groups].map(([key, entries]) => [key, entries[0].url]));
      await fs.writeFile(outputPath, JSON.stringify([{ updatedAt, rsp }], null, 2));
    }

    console.log(`Downloaded ${downloaded} new images (${urlList.length} found) to ${assetDir}`);
    console.log(`Saved manifest to ${outputPath}`);
  } finally {
    await browser.close();
  }
}
