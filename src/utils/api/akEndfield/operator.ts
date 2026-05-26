export interface OperatorAssetEntry {
  type: 'character' | 'background' | 'ui';
  versions: string[];
  videos?: string[];
}

function cleanPayload(raw: string): string {
  return raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function findJsonFragmentsAround(html: string, needle = '/upload/') {
  const indices: number[] = [];
  let idx = html.indexOf(needle);
  while (idx !== -1) {
    indices.push(idx);
    idx = html.indexOf(needle, idx + 1);
  }

  const fragments: string[] = [];

  for (const pos of indices) {
    // search backwards for a { or [
    let start = -1;
    for (let i = pos; i >= 0; i--) {
      const ch = html[i];
      if (ch === '{' || ch === '[') {
        start = i;
        break;
      }
      // stop if we hit a tag start
      if (ch === '<') break;
    }
    if (start === -1) continue;

    // scan forward to find matching closing brace/bracket
    const openCh = html[start];
    const closeCh = openCh === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (ch === '\\' && !esc) {
        esc = true;
        continue;
      }
      if (ch === '"' && !esc) inStr = !inStr;
      if (!inStr) {
        if (ch === openCh) depth++;
        else if (ch === closeCh) {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      esc = false;
    }
    if (end === -1) continue;
    const frag = html.slice(start, end + 1);
    fragments.push(frag);
  }

  // dedupe
  return Array.from(new Set(fragments));
}

function collectOperatorEntriesFromObject(obj: any, out: { name?: string; images: string[]; videos: string[] }[] = []) {
  if (!obj || typeof obj !== 'object') return out;

  // if object has name/title and media URLs inside, treat as entry
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  const nameKey = keys.find((k) => ['name', 'title', 'cid', 'id', 'label'].includes(k));

  const media: { images: string[]; videos: string[] } = { images: [], videos: [] };

  function walk(o: any) {
    if (!o) return;
    if (typeof o === 'string') {
      const s = o as string;
      if (s.includes('/upload/')) {
        if (s.endsWith('.mp4') || s.includes('/video/')) media.videos.push(s);
        else media.images.push(s);
      }
      return;
    }
    if (Array.isArray(o)) {
      for (const v of o) walk(v);
      return;
    }
    if (typeof o === 'object') {
      for (const k of Object.keys(o)) walk(o[k]);
    }
  }

  walk(obj);

  if ((media.images.length || media.videos.length) && nameKey) {
    const name = obj[nameKey];
    out.push({ name, images: Array.from(new Set(media.images)), videos: Array.from(new Set(media.videos)) });
  }

  // recurse into children looking for nested entries
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'object') collectOperatorEntriesFromObject(v, out);
  }

  return out;
}

export async function fetchOperator(): Promise<Record<string, OperatorAssetEntry>> {
  const url = 'https://endfield.gryphline.com/th-th#operator';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed to fetch operator page: ${res.status}`);
  const html = await res.text();
  const clean = cleanPayload(html);

  const fragments = findJsonFragmentsAround(clean, '/upload/');
  const entries: { name?: string; images: string[]; videos: string[] }[] = [];

  for (const frag of fragments) {
    try {
      const parsed = JSON.parse(frag);
      collectOperatorEntriesFromObject(parsed, entries);
    } catch (e) {
      // ignore parse errors
    }
  }

  // final grouping by sanitized name
  const grouped: Record<string, OperatorAssetEntry> = {};
  let idx = 1;
  for (const e of entries) {
    const base = e.name && String(e.name).trim().length > 0 ? String(e.name) : `operator_${idx++}`;
    const key = base.replace(/\s+/g, '_').toLowerCase();
    grouped[key] = grouped[key] || { type: 'character', versions: [], videos: [] };
    grouped[key].versions.push(...(e.images || []));
    grouped[key].videos = Array.from(new Set([...(grouped[key].videos || []), ...(e.videos || [])]));
    // cap versions
    grouped[key].versions = Array.from(new Set(grouped[key].versions)).slice(0, 5);
  }

  return grouped;
}
