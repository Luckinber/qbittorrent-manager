# qBittorrent Manager Script

This script is used to manage torrents in qBittorrent. It authenticates with the qBittorrent API, fetches all torrents and determines if they should be deleted. It determines this by checking if the torrents;

- are in a managed category,
- have seeded long enough (default 10 days),
- and aren't hardlinked.

It then removes them as well as their directory in case you had to extract compressed files from the torrent that aren't otherwise deleted by qBittorrent. 

## Dependencies

This script requires the following tools:

- `jq`: A lightweight and flexible command-line JSON processor. This is used to parse the JSON response from the qBittorrent API. You can install it using your package manager, for example `sudo apt install jq` on Ubuntu.

- `curl`: A command-line tool used for transferring data with URLs. This is used to send requests to the qBittorrent API. It's likely already installed on your system, but if not, you can install it using your package manager, for example `sudo apt install curl` on Ubuntu.

## Installation

To install this script, clone this repository and install the dependencies. You can do this by running the following commands:

```bash
git clone https://github.com/Luckinber/qbittorrent-manager.git
cd qbittorrent-manager
sudo apt install jq curl
```

## Configuration

Before running the script, you need to configure it by editing the `config.sh` file. Change at least the following values:

- `USERNAME`: Your qBittorrent username.
- `PASSWORD`: Your qBittorrent password.
- `RELATIVE_PATH`: The path that qBitTorrent thinks your torrents are stored at.
- `ABSOLUTE_PATH`: The actual path that your torrents are stored at on your filesystem.
- `MANAGED_CATEGORIES`: The categories of torrents that this script should manage.

Other values can be changed as well, but the defaults should be fine.

## Usage

This script must be run on a machine that has access to the filesystem where your torrents are stored (either locally or through a network share that supports hardlinks). After installing the dependencies and configuring the script, you can run it with the following command:

```bash
bash qbittorrent-manager.sh
```

## Note

This script is intended to be used with qBittorrent. Ensure that the qBittorrent Web API is enabled and accessible.