#!/usr/bin/env node
require('dotenv').config();
const cron = require('node-cron');
const { QBittorrent } = require('@ctrl/qbittorrent');
const fs = require('fs');

const config = {
  host: process.env.QBITTORRENT_HOST || 'http://localhost:8080',
  username: process.env.QBITTORRENT_USERNAME || '',
  password: process.env.QBITTORRENT_PASSWORD || '',
  relativePath: process.env.TORRENT_RELATIVE_PATH || '',
  managedCategories: (process.env.MANAGED_CATEGORIES || '').split(',').filter(Boolean),
  seedingDaysRequired: parseInt(process.env.SEEDING_DAYS_REQUIRED || '10', 10),
  hardlinkCheck: process.env.HARDLINK_CHECK !== 'false',
  managerCronSchedule: process.env.MANAGER_CRON_SCHEDULE || '0 2 * * *', // 2 AM daily
  logLevel: process.env.LOG_LEVEL || 'info'
};

const logger = {
  debug: (msg) => config.logLevel === 'debug' && console.log(`[DEBUG] ${msg}`),
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

let qbClient;

async function initClient() {
  try {
    qbClient = new QBittorrent({
      baseUrl: config.host,
      username: config.username,
      password: config.password,
    });
    logger.info(`Connected to qBittorrent at ${config.host}`);
  } catch (error) {
    logger.error(`Failed to initialize qBittorrent client: ${error.message}`);
    process.exit(1);
  }
}

async function manager() {
  logger.info('Starting torrent management process...');

  try {
    if (!qbClient) await initClient();

    // Get all torrents
    const torrents = await qbClient.getTorrents();
    logger.info(`Found ${torrents.length} torrents`);

    const toDelete = [];
    for (const torrent of torrents) {
      const name = torrent.name;
      const category = torrent.category || '';
      const seedingTime = torrent.seeding_time || 0;

      let path = torrent.content_path || '';
      if (path.includes(config.relativePath)) {
        path = path.replace(config.relativePath, '/torrents');
      }

      // Check: managed category
      if (config.managedCategories.length > 0 && !config.managedCategories.includes(category)) {
        logger.debug(`Skipping ${name} - category '${category}' not managed`);
        continue;
      }

      // Check: hardlinks
      if (config.hardlinkCheck && fs.existsSync(path)) {
        try {
          const stats = fs.statSync(path);
          if (stats.nlink > 1) {
            logger.debug(`Skipping ${name} - has hardlinks (nlink=${stats.nlink})`);
            continue;
          }
        } catch (e) {
          logger.warn(`Could not check hardlinks for ${name}: ${e.message}`);
        }
      }

      // Check: seeding time
      const seedingDays = seedingTime / (60 * 60 * 24);
      if (seedingDays < config.seedingDaysRequired) {
        logger.debug(`Skipping ${name} - seeding for only ${seedingDays.toFixed(1)} days`);
        continue;
      }

      // Passed all checks - mark for deletion
      toDelete.push({ name, path });
    }
  
    if (toDelete.length === 0) {
      logger.info('No torrents to delete');
      return;
    }
    logger.warn(`Found ${toDelete.length} torrent(s) to delete:`);
    toDelete.forEach((item, index) => {
      logger.warn(`  - ${index + 1}. ${item.name} (${item.path})`);
    });
    if (config.dryRun) {
      logger.info('DRY RUN: Not performing actual deletion');
      return;
    }
    logger.info('Deleting torrents...');
    await qbClient.deleteTorrents(toDelete.map(item => item.hash), { deleteFiles: true });
    
    logger.info('Finished deleting torrents');
  } catch (error) {
    logger.error(`Manager error: ${error.message}`);
    logger.debug(error.stack);
  }
}

function main() {
  const missing = [];
  
  if (!config.username) missing.push('QBITTORRENT_USERNAME');
  if (!config.password) missing.push('QBITTORRENT_PASSWORD');
  if (!config.relativePath) missing.push('TORRENT_RELATIVE_PATH');
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  logger.info('Configuration validated');
  logger.info(`Torrent path mapping: ${config.relativePath} -> /torrents (container)`);
  if (args.includes('--run-once')) {
    manager();
  } else {
    logger.info(`Scheduling manager to run at: ${config.managerCronSchedule}`);
    cron.schedule(config.managerCronSchedule, () => manager());
  }
}

main()
