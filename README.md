# qBittorrent Manager

A minimal, production-ready Node.js Docker application for managing torrents in qBittorrent. Automatically deletes torrents depending on category, hardlinks, and seeding time. Built-in cron scheduler for automatic operation.

## Configuration

All settings are environment variables.

### Required Variables

```bash
QBITTORRENT_HOST=http://qbittorrent:8080     # qBittorrent API URL
QBITTORRENT_USERNAME=admin                   # qBittorrent username
QBITTORRENT_PASSWORD=admin                   # qBittorrent password
TORRENT_RELATIVE_PATH=/media/torrents        # Path qBittorrent sees internally
MANAGED_CATEGORIES=movies,tv,books           # Categories to manage
```

**Volume Mount:** Mount your torrent storage to `/torrents` in the container:
```bash
-v /actual/path/to/torrents:/torrents
```

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SEEDING_DAYS_REQUIRED` | 10 | Minimum days a torrent must seed |
| `HARDLINK_CHECK` | true | Skip torrents with hardlinked files |
| `MANAGER_CRON_SCHEDULE` | "0 2 * * *" | Cron schedule for manager (2 AM daily) |
| `LOG_LEVEL` | info | Log level: debug, info, warn, error |
| `DRY_RUN` | false | Test mode (show what would be deleted) |

See [.env.example](.env.example) for full details.

## Quick Start

### Docker Compose (Recommended)

```bash
git clone https://github.com/Luckinber/qbittorrent-manager.git
cd qbittorrent-manager
# Change: -v /path/to/torrents:/torrents
docker-compose up -d
docker-compose logs -f qbittorrent-manager
```

### Docker

```bash
# Build
docker build -t qbittorrent-manager:latest .

# Run (with cron scheduler)
docker run --env-file .env \
  -v /path/to/torrents:/torrents \
  -d qbittorrent-manager:latest

# Run (manual, one-time execution)
docker run --env-file .env \
  -v /path/to/torrents:/torrents \
  qbittorrent-manager:latest --run-once
```

### Node.js (Manual)

```bash
# Install dependencies
npm install
# Run
node app.js --run-once
```

## Notes

- The container **must have access to your torrent storage** filesystem (via volume mount)
- qBittorrent Web API must be enabled and accessible
- Hardlink checking requires filesystem access
- For security, use strong qBittorrent credentials