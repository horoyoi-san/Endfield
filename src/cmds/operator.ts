import path from 'node:path';
import argvUtils from '../utils/argv.js';
import logger from '../utils/logger.js';

const NAME_MAP: Record<string, string> = {
  akekuri: 'Akekuri',
  alesh: 'Alesh',
  antal: 'Antal',
  arclight: 'Arclight',
  ardelia: 'Ardelia',
  avywenna: 'Avywenna',
  camille: 'Camille',
  catcher: 'Catcher',
  chen: 'Chen',
  dapan: 'Da Pan',
  ember: 'Ember',
  endministrator1: 'Endministrator1',
  endministrator2: 'Endministrator2',
  estella: 'Estella',
  fluorite: 'Fluorite',
  gilberta: 'Gilberta',
  laevatain: 'Laevatain',
  lastrite: 'Last Rite',
  lifeng: 'Lifeng',
  liino: 'Liino',
  lizhiyan: 'Li Zhiyan',
  mifu: 'Mi Fu',
  perlica: 'Perlica',
  prelica: 'Perlica',
  pogranichnik: 'Pogranichnik',
  ring: 'Ring',
  rossi: 'Rossi',
  snowshine: 'Snowshine',
  tangtang: 'Tangtang',
  wulfgard: 'Wulfgard',
  xaihi: 'Xaihi',
  yvonne: 'Yvonne',
  zhuangfy: 'Zhuang Fangyi',
  zhuangfangyi: 'Zhuang Fangyi',
};

async function fetchCharacterMedia(): Promise<Record<string, string>> {
  const response = await fetch('https://endfield.gryphline.com/th-th', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch home page for operator assets: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const jsChunkUrls = html.match(/https:\/\/web-static\.hg-cdn\.com\/endfield\/official-v4\/_next\/static\/chunks\/[^"']+\.js/g) || [];

  const mediaUrls = new Set<string>();
  for (const chunkUrl of jsChunkUrls) {
    try {
      const r = await fetch(chunkUrl);
      if (!r.ok) continue;
      const js = await r.text();
      const matches = js.match(/static\/media\/[a-zA-Z0-9_-]+\.[a-f0-9]+\.(png|webp|jpg|jpeg)/gi) || [];
      for (const m of matches) {
        mediaUrls.add(`https://web-static.hg-cdn.com/endfield/official-v4/_next/${m}`);
      }
    } catch {
      // ignore individual chunk failures
    }
  }

  const rsp: Record<string, string> = {};
  for (const url of mediaUrls) {
    const file = url.split('/').pop()!;
    const rawKey = file.split('.')[0].toLowerCase();
    if (rawKey.includes('_')) continue;
    if (!/^[a-z0-9]+\.[a-f0-9]+\.(png|webp|jpg|jpeg)$/i.test(file)) continue;

    const displayName = NAME_MAP[rawKey] || rawKey;
    if (!rsp[displayName]) {
      rsp[displayName] = url;
    }
  }

  return Object.fromEntries(
    Object.entries(rsp).sort(([a], [b]) => a.localeCompare(b))
  );
}

export default async function operator() {
  const outputDir = argvUtils.getArgv()['outputDir'] ?? path.resolve('output');
  const characterRsp = await fetchCharacterMedia();
  const now = new Date().toISOString();

  // 1. Write output/characters.json (format used by pages-v2 web frontend)
  const charactersPayload = [
    {
      updatedAt: now,
      rsp: characterRsp,
    },
  ];
  const charactersPath = path.join(outputDir, 'characters.json');
  await Bun.write(charactersPath, JSON.stringify(charactersPayload, null, 2));

  // 2. Write output/operator.json (grouped asset map format)
  const operatorAssets: Record<string, { type: 'character'; versions: string[] }> = {};
  for (const [name, url] of Object.entries(characterRsp)) {
    operatorAssets[name.toLowerCase().replace(/\s+/g, '_')] = {
      type: 'character',
      versions: [url],
    };
  }

  const operatorPayload = {
    updatedAt: now,
    totalGroups: Object.keys(operatorAssets).length,
    assets: operatorAssets,
  };
  const operatorPath = path.join(outputDir, 'operator.json');
  await Bun.write(operatorPath, JSON.stringify(operatorPayload, null, 2));

  logger.info(`Saved operator & character payloads (${Object.keys(characterRsp).length} items) to ${charactersPath} and ${operatorPath}`);
}

