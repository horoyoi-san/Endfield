import path from 'node:path';
import argvUtils from '../utils/argv.js';
import logger from '../utils/logger.js';

interface InformationCover {
  url: string;
  size: number;
  width: number;
  height: number;
}

interface InformationPreview extends InformationCover {
  duration: number;
}

interface InformationVideoContent {
  cate: string;
  cover: InformationCover;
  title: string;
  video: string;
  preview: InformationPreview;
  displayTime: string;
}

interface InformationVideoItem {
  cid: string;
  name: string;
  content: InformationVideoContent;
  sticky: boolean;
  status: number;
}

export interface InformationBulletinItem {
  cid: string;
  tab: string;
  sticky: boolean;
  title: string;
  author: string;
  displayTime: number;
  cover: string;
  extraCover: string;
  brief: string;
  url?: string;
}

interface InformationPageData {
  page: string;
  updatedAt: string;
  total: number;
  bulletins: InformationBulletinItem[];
  videos: InformationVideoItem[];
}

function cleanPayload(raw: string): string {
  return raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function extractSection(clean: string, key: 'bulletins' | 'videos', total: number): string {
  const openMarker = `{"${key}":[`;
  const closeMarker = `],"total":${total}}`;
  const start = clean.indexOf(openMarker);
  if (start === -1) {
    throw new Error(`Failed to find ${key} section start marker`);
  }

  const end = clean.indexOf(closeMarker, start);
  if (end === -1) {
    throw new Error(`Failed to find ${key} section end marker`);
  }

  return clean.slice(start, end + closeMarker.length);
}

async function fetchInformationPage(): Promise<InformationPageData> {
  const response = await fetch('https://endfield.gryphline.com/th-th#information', {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch information page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const clean = cleanPayload(html);

  const bulletins = JSON.parse(extractSection(clean, 'bulletins', 48)) as { bulletins: InformationBulletinItem[]; total: number };
  const videos = JSON.parse(extractSection(clean, 'videos', 20)) as { videos: InformationVideoItem[]; total: number };

  return {
    page: 'https://endfield.gryphline.com/th-th#information',
    updatedAt: new Date().toISOString(),
    total: bulletins.bulletins.length + videos.videos.length,
    bulletins: bulletins.bulletins,
    videos: videos.videos,
  };
}

export default async function information() {
  const outputDir = argvUtils.getArgv()['outputDir'] ?? path.resolve('output');
  const payload = await fetchInformationPage();
  const filePath = path.join(outputDir, 'information.json');
  await Bun.write(filePath, JSON.stringify([payload], null, 2));
  logger.info(`Saved information page payload to ${filePath}`);
}
