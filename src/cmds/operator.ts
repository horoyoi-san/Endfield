import path from 'node:path';
import argvUtils from '../utils/argv.js';
import logger from '../utils/logger.js';
import { fetchOperator } from '../utils/api/akEndfield/operator.js';

export default async function operator() {
  const outputDir = argvUtils.getArgv()['outputDir'] ?? path.resolve('output');
  const archive = await fetchOperator();
  const filePath = path.join(outputDir, 'operator.json');

  await Bun.write(filePath, JSON.stringify({
    updatedAt: new Date().toISOString(),
    totalGroups: Object.keys(archive).length,
    assets: archive,
  }, null, 2));

  logger.info(`Saved operator archive to ${filePath}`);
}
