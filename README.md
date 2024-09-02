# qBittorrent Manager Script

This script is used to manage torrents in qBittorrent. It authenticates with the qBittorrent API, fetches all torrents, and determines if they should be deleted. It determines this by checking if the torrents:

- are in a managed category (set in the config),
- aren't hardlinked (and won't save any space if deleted),
- and have seeded long enough (default 10 days).

It then removes them as well as their directory in case you had to extract compressed files from the torrent that aren't otherwise deleted by qBittorrent.

Additionally, there is a cleaner script that goes through the managed categories and deletes any files or directories that don't have an associated torrent. This helps in keeping your directories clean and free of orphaned files.

## Dependencies

This script requires the following tools:

- `jq`: A lightweight and flexible command-line JSON processor. This is used to parse the JSON response from the qBittorrent API. You can install it using your package manager, for example `sudo apt install jq` on Ubuntu.

- `curl`: A command-line tool used for transferring data with URLs. This is used to send requests to the qBittorrent API. It's likely already installed on your system, but if not, you can install it using your package manager, for example `sudo apt install curl` on Ubuntu.

## Installation

To install this script, clone this repository and install the dependencies. You can do this by running the following commands:

```bash
sudo apt install jq curl
git clone https://github.com/Luckinber/qbittorrent-manager.git
cd qbittorrent-manager
chmod +x qbittorrent-manager.sh
chmod +x qbittorrent-cleaner.sh
```

## Configuration

Before running the script, you need to configure it by editing the `config.sh` file. Change at least the following values:

- `USERNAME`: Your qBittorrent username.
- `PASSWORD`: Your qBittorrent password.
- `RELATIVE_PATH`: The ROOT path that qBitTorrent thinks ALL torrents are stored at.
- `ABSOLUTE_PATH`: The actual ROOT path that ALL torrents are stored at on your filesystem.
- `CATEGORIES_PATH`: The relative path from the ROOT path to the directory where the categories are stored.
- `MANAGED_CATEGORIES`: The categories of torrents that this script should manage.

Other values can be changed as well, but the defaults should be fine.

## Usage

This script must be run on a machine that has access to the filesystem where your torrents are stored (either locally or through a network share that supports hardlinks). After installing the dependencies and configuring the script, you can run it with the following command:

```bash
./qbittorrent-manager.sh
```

To run the cleaner script, use the following command:

```bash
./qbittorrent-cleaner.sh
```

Both scripts will auto confirm deletions with the `-y` flag:

```bash
./qbittorrent-manager.sh -y
```

## Note

This script is intended to be used with qBittorrent. Ensure that the qBittorrent Web API is enabled and accessible.