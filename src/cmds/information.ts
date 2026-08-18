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

function extractSection(clean: string, key: 'bulletins' | 'videos'): string {
  const openMarker = `{"${key}":[`;
  const start = clean.indexOf(openMarker);
  if (start === -1) {
    throw new Error(`Failed to find ${key} section start marker`);
  }

  const totalMarker = '],"total":';
  const totalIndex = clean.indexOf(totalMarker, start);
  if (totalIndex === -1) {
    throw new Error(`Failed to find ${key} section total marker`);
  }

  const endBraceIndex = clean.indexOf('}', totalIndex);
  if (endBraceIndex === -1) {
    throw new Error(`Failed to find ${key} section end brace`);
  }

  return clean.slice(start, endBraceIndex + 1);
}

async function fetchVideosFromApi(lang = 'th-th'): Promise<InformationVideoItem[]> {
  const videos: InformationVideoItem[] = [];
  let page = 1;
  let total = 0;

  try {
    do {
      const url = `https://endfield.gryphline.com/api/content/info_video?lang=${lang}&page=${page}&pageSize=10`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (!response.ok) {
        logger.warn(`Video API request failed on page ${page}: ${response.status} ${response.statusText}`);
        break;
      }

      const json = await response.json();
      if (json.code !== 0 || !json.data?.list) {
        logger.warn(`Video API returned non-zero code or empty data on page ${page}`);
        break;
      }

      total = json.data.total ?? 0;
      const pageList: InformationVideoItem[] = json.data.list;
      videos.push(...pageList);

      if (videos.length >= total || pageList.length === 0) {
        break;
      }
      page++;
    } while (page <= 20);
  } catch (error) {
    logger.warn('Failed to fetch videos from API:', error);
  }

  return videos;
}

async function fetchBulletinsFromHtml(lang = 'th-th'): Promise<InformationBulletinItem[]> {
  const response = await fetch(`https://endfield.gryphline.com/${lang}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch home page for bulletins: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const clean = cleanPayload(html);
  const bulletinsData = JSON.parse(extractSection(clean, 'bulletins')) as { bulletins: InformationBulletinItem[]; total: number };
  return bulletinsData.bulletins ?? [];
}

async function fetchInformationPage(): Promise<InformationPageData> {
  let videos = await fetchVideosFromApi('th-th');

  const response = await fetch('https://endfield.gryphline.com/th-th', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch information page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const clean = cleanPayload(html);

  const bulletinsData = JSON.parse(extractSection(clean, 'bulletins')) as { bulletins: InformationBulletinItem[]; total: number };
  const bulletins = bulletinsData.bulletins ?? [];

  // Fallback to SSR videos if API returns empty
  if (videos.length === 0) {
    try {
      const videosData = JSON.parse(extractSection(clean, 'videos')) as { videos: InformationVideoItem[]; total: number };
      videos = videosData.videos ?? [];
    } catch {
      logger.warn('Failed to extract SSR videos fallback');
    }
  }

  return {
    page: 'https://endfield.gryphline.com/th-th#information',
    updatedAt: new Date().toISOString(),
    total: bulletins.length + videos.length,
    bulletins,
    videos,
  };
}

export default async function information() {
  const outputDir = argvUtils.getArgv()['outputDir'] ?? path.resolve('output');
  const payload = await fetchInformationPage();
  const filePath = path.join(outputDir, 'information.json');
  await Bun.write(filePath, JSON.stringify([payload], null, 2));
  logger.info(`Saved information page payload (${payload.videos.length} videos, ${payload.bulletins.length} bulletins) to ${filePath}`);
}

