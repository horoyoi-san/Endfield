import puppeteer from "puppeteer";
import fs from "fs/promises";

const OUTPUT_PATH = "./output/operator.json";

function getBaseName(file: string) {
  return file
    .replace(/\?.*$/, "")
    .replace(/\.[a-f0-9]{6,10}\.(png|webp|mp4|jpg|jpeg|svg)$/i, "")
    .replace(/\.(png|webp|mp4|jpg|jpeg|svg)$/i, "");
}

function getCategory(url: string, file: string) {
  const u = url.toLowerCase();

  // 🎮 UI
  if (
    u.includes("button") ||
    u.includes("icon") ||
    u.includes("logo") ||
    u.includes("store") ||
    u.includes("theme") ||
    u.includes("ui")
  ) {
    return "ui";
  }

  // 🌄 background
  if (
    u.includes("bg") ||
    u.includes("background") ||
    u.includes("wave") ||
    u.includes("banner") ||
    u.includes("kv") ||
    file.startsWith("bg")
  ) {
    return "background";
  }

  // 👤 character (default)
  return "character";
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Only collect assets referenced directly in the page DOM (images/videos/source)
  await page.goto("https://endfield.gryphline.com/th-th#operator", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => (globalThis as any).scrollTo(0, (globalThis as any).document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Extract operator blocks: find name, images, and videos inside the same visual block.
  const blocks: {
    name: string;
    images: string[];
    videos: string[];
  }[] = await page.evaluate(() => {
    function findNameForElement(el: Element | null) {
      if (!el) return null;
      // search for common name selectors first
      const nameSelectors = ['.name', '.title', '.caption', '.operator-name', '.character-name', '.char-name'];
      for (const sel of nameSelectors) {
        const found = el.querySelector(sel);
        if (found && found.textContent && found.textContent.trim().length > 0) return found.textContent.trim();
      }

      // fallback: look for heading tags inside element
      for (let i = 1; i <= 6; i++) {
        const h = el.querySelector('h' + i);
        if (h && h.textContent && h.textContent.trim().length > 0) return h.textContent.trim();
      }

      // fallback: look for a text node directly under the element
      const text = el.textContent ? el.textContent.trim() : '';
      if (text.length > 1 && text.length < 80) return text.split('\n')[0].trim();
      return null;
    }

    const results: Record<string, { images: Set<string>; videos: Set<string> }> = {};

    function isContentUrl(u: string) {
      if (!u) return false;
      const s = u.toLowerCase();
      return s.includes('/upload/') || s.includes('/uploads/') || /\/upload\/(image|video)\//.test(s);
    }

    // Restrict to the operator section: prefer location.hash, then common fallbacks
    const hash = (globalThis as any).location && (globalThis as any).location.hash ? (globalThis as any).location.hash : '';
    let root: Element | Document = document;
    if (hash) {
      try {
        const byHash = document.querySelector(hash);
        if (byHash) root = byHash as Element;
      } catch (e) {
        // ignore invalid selector
      }
    }
    if (root === document) {
      const fallback = document.querySelector('[data-anchor="operator"], [data-section="operator"], section[id*="operator"], div[id*="operator"]');
      if (fallback) root = fallback as Element;
    }

    // Prefer explicit operator blocks: elements that contain both an image/video and a name
    const candidateEls = Array.from((root as Element).querySelectorAll('*')).filter((el) => {
      try {
        const hasMedia = !!el.querySelector('img, video, picture, source');
        const hasName = !!el.querySelector('h1,h2,h3,h4,h5,h6,.operator-name,.character-name,.char-name,.title,.caption,figcaption');
        return hasMedia && hasName;
      } catch (e) {
        return false;
      }
    });

    // Remove nested candidates (keep top-level blocks)
    const topLevelCandidates: Element[] = [];
    for (const c of candidateEls) {
      if (!candidateEls.some((other) => other !== c && other.contains(c))) topLevelCandidates.push(c as Element);
    }

    if (topLevelCandidates.length > 0) {
      for (const blockEl of topLevelCandidates) {
        const name = findNameForElement(blockEl) || 'unknown';
        results[name] = results[name] || { images: new Set(), videos: new Set() };
        const imgs = Array.from(blockEl.querySelectorAll('img')) as HTMLImageElement[];
        for (const img of imgs) {
          const src = img.src || img.getAttribute('data-src') || '';
          if (src && isContentUrl(src)) results[name].images.add(src);
        }
        const vids = Array.from(blockEl.querySelectorAll('video')) as HTMLVideoElement[];
        for (const v of vids) {
          const src = v.currentSrc || v.src || '';
          if (src && isContentUrl(src)) results[name].videos.add(src);
          for (const s of Array.from(v.querySelectorAll('source'))) {
            const ssrc = (s as HTMLSourceElement).src || (s as HTMLSourceElement).getAttribute('src') || '';
            if (ssrc && isContentUrl(ssrc)) results[name].videos.add(ssrc);
          }
        }
        const sources = Array.from(blockEl.querySelectorAll('source')) as HTMLSourceElement[];
        for (const s of sources) {
          const ssrc = s.src || s.getAttribute('src') || '';
          if (!ssrc) continue;
          if (isContentUrl(ssrc)) {
            if (ssrc.endsWith('.mp4') || ssrc.includes('/video/')) results[name].videos.add(ssrc);
            else results[name].images.add(ssrc);
          }
        }
      }
    } else {
      // fallback: scan media and attribute to nearest name (previous behavior)
      const imgEls = Array.from((root as Element).querySelectorAll('img')) as HTMLImageElement[];
      for (const img of imgEls) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (!src) continue;
        // climb ancestors to find a nearby name
        let ancestor: Element | null = img;
        let name: string | null = null;
        for (let depth = 0; depth < 5; depth++) {
          ancestor = ancestor.parentElement;
          if (!ancestor) break;
          name = findNameForElement(ancestor);
          if (name) break;
        }
        if (!name) {
          const cap = img.closest('figure')?.querySelector('figcaption');
          if (cap && cap.textContent) name = cap.textContent.trim();
        }
        const key = name || 'unknown';
        results[key] = results[key] || { images: new Set(), videos: new Set() };
        if (isContentUrl(src)) results[key].images.add(src);
      }

      const videoEls = Array.from((root as Element).querySelectorAll('video')) as HTMLVideoElement[];
      for (const v of videoEls) {
        const src = v.currentSrc || v.src || '';
        if (!src) continue;
        let ancestor: Element | null = v;
        let name: string | null = null;
        for (let depth = 0; depth < 5; depth++) {
          ancestor = ancestor.parentElement;
          if (!ancestor) break;
          name = findNameForElement(ancestor);
          if (name) break;
        }
        const key = name || 'unknown';
        results[key] = results[key] || { images: new Set(), videos: new Set() };
        if (isContentUrl(src)) results[key].videos.add(src);
      }
    }

    // convert to array
    return Object.keys(results).map((k) => ({
      name: k,
      images: Array.from(results[k].images),
      videos: Array.from(results[k].videos),
    }));
  });

  console.log('Blocks found:', blocks.length);

  // Build grouped map keyed by sanitized name
  const grouped: Record<string, { type: string; versions: string[]; videos?: string[] }> = {};
  let idx = 1;
  for (const b of blocks) {
    const baseName = b.name && b.name !== 'unknown' ? b.name : `operator_${idx++}`;
    const key = baseName.replace(/\s+/g, '_').toLowerCase();
    grouped[key] = {
      type: 'character',
      versions: b.images.slice(0, 5),
      videos: b.videos,
    };
  }

  // ======================
  // 📊 SORT versions
  // ======================
  for (const key in grouped) {
    grouped[key].versions.sort();
  }

  const result = {
    updatedAt: new Date().toISOString(),
    totalGroups: Object.keys(grouped).length,
    assets: grouped,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));

  console.log("✅ grouped + merged variants saved");

  await browser.close();
}

run().catch(console.error);
