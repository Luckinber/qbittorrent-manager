#!/usr/bin/env node
require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');

const config = {
  host: process.env.QBITTORRENT_HOST || 'http://localhost:8080',
  username: process.env.QBITTORRENT_USERNAME || '',
  password: process.env.QBITTORRENT_PASSWORD || '',
  relativePath: process.env.TORRENT_RELATIVE_PATH || '',
  absolutePath: process.env.TORRENT_ABSOLUTE_PATH || '/torrents',
  managedCategories: (process.env.MANAGED_CATEGORIES || '').split(',').filter(Boolean),
  seedingDaysRequired: parseInt(process.env.SEEDING_DAYS_REQUIRED || '10', 10),
  hardlinkCheck: process.env.HARDLINK_CHECK !== 'false',
  managerCronSchedule: process.env.MANAGER_CRON_SCHEDULE || '0 2 * * *', // 2 AM daily
  logLevel: process.env.LOG_LEVEL || 'info',
  dryRun: process.env.DRY_RUN === 'true',
};

const logger = {
  debug: (msg) => config.logLevel === 'debug' && console.log(`[DEBUG] ${msg}`),
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

let cookie;

async function initqBittorrent() {
  try {
    const response = await fetch(`${config.host}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`,
    });
    if (!response.ok) throw new Error(`Failed to login to qBittorrent: ${response.statusText}`);

    const result = response.headers.get('set-cookie');
    if (!result) throw new Error('No cookie received from qBittorrent login');
    cookie = result.split(';')[0];

    logger.info(`Connected to qBittorrent at ${config.host}`);
  } catch (error) {
    logger.error(`Failed to initialize qBittorrent client: ${error.message}`);
    logger.debug(error.stack);
    process.exit(1);
  }
}

async function manager() {
  logger.info('Starting torrent management process...');

  try {
    if (!cookie) await initqBittorrent();

    // Get all torrents
    const data = await fetch(`${config.host}/api/v2/torrents/info`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
    });
    if (!data.ok) throw new Error(`Failed to fetch torrents: ${data.statusText}`);
    const torrents = await data.json();
    logger.info(`Found ${torrents.length} torrents`);

    const toDelete = [];
    for (const torrent of torrents) {
      const hash = torrent.hash;
      const name = torrent.name;
      const category = torrent.category || '';
      const seedingTime = torrent.seeding_time || 0;

      let path = torrent.content_path || '';
      if (path.includes(config.relativePath)) {
        path = path.replace(config.relativePath, config.absolutePath);
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
          let hardlinked = false;
          if (stats.isDirectory()) {
            for (const file of fs.readdirSync(path)) {
              const filePath = `${path}/${file}`;
              const fileStats = fs.statSync(filePath);
              if (fileStats.nlink > 1) hardlinked = true;
            }
          }
          if (stats.isFile() && stats.nlink > 1) hardlinked = true;
          if (hardlinked) {
            logger.debug(`Skipping ${name} - contains hardlinked files`);
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
      logger.info(`Marking ${name} for deletion (seeding for ${seedingDays.toFixed(1)} days)`);
      toDelete.push({ hash, name, path });
    }
  
    if (toDelete.length === 0) {
      logger.info('No torrents to delete');
      return;
    }
    logger.warn(`Found ${toDelete.length} torrent(s) to delete:`);
    toDelete.forEach((item, index) => {
      logger.warn(`  - ${index + 1}. ${item.name} (${item.path})`);
    });

    if (!config.dryRun) {
      logger.info('Deleting torrents...');
      const hashes = toDelete.map(item => item.hash);
      const body = `hashes=${hashes[0]}&deleteFiles=false`;
      const response = await fetch(`${config.host}/api/v2/torrents/delete`, {
        method: 'POST',
        headers: {
          'Cookie': cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });
      if (!response.ok) throw new Error(`Failed to delete torrents: ${response.statusText}`);
      logger.info('Torrents deleted successfully');
    }
    
    logger.info('Finished managing torrents');
  } catch (error) {
    logger.error(`Error during torrent management: ${error.message}`);
    logger.debug(error.stack);
    process.exit(1);
  }
}

async function main() {
  const missing = [];
  
  if (!config.username) missing.push('QBITTORRENT_USERNAME');
  if (!config.password) missing.push('QBITTORRENT_PASSWORD');
  if (!config.relativePath) missing.push('TORRENT_RELATIVE_PATH');
  
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  logger.info('Configuration validated');
  logger.info(`Qbitorrent relative path: ${config.relativePath}`);
  logger.info(`File system absolute path: ${config.absolutePath}`);
  logger.info(`Dry run: ${config.dryRun}`);

  const args = process.argv.slice(2);
  if (args.includes('--run-once')) {
    logger.info('Running manager once (no scheduling)');
    await manager();
  } else {
    logger.info(`Scheduling manager to run at: ${config.managerCronSchedule}`);
    cron.schedule(config.managerCronSchedule, () => manager());
  }
}

main()
