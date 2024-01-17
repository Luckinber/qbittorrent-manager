#!/bin/bash

# ------------------------------------------------------------------------------------------------- #
# ------------------------------------------READ ME------------------------------------------------ #
# ------------------------------------------------------------------------------------------------- #
# The USERNAME and PASSWORD, RELATIVE_PATH, ABSOLUTE_PATH and MANAGED_CATEGORIES variables must be  #
# set as they are likely to be different for you. The other variables are optional and can be left  #
# as they are. 																				        #

# ------------------------------------------------------------------------------------------------- #
# ------------------------------------qBittorrent Web API------------------------------------------ #
# ------------------------------------------------------------------------------------------------- #
# The URL of your qBittorrent Web API
HOST=http://localhost:8080

# Your qBittorrent Web API username
USERNAME=CHANGE_ME

# Your qBittorrent Web API password
PASSWORD=CHANGE_ME

# ------------------------------------------------------------------------------------------------- #
# --------------------------------qBittorrent torrent management----------------------------------- #
# ------------------------------------------------------------------------------------------------- #
# The ROOT path that qBitTorrent thinks ALL torrents are stored at, no trailing slash
RELATIVE_PATH=CHANGE_ME

# The actual ROOT path that ALL torrents are stored at on your filesystem, no trailing slash
ABSOLUTE_PATH=CHANGE_ME

# The categories of torrents that this script should manage, delimited by spaces eg ("movies" "tv" "books")
MANAGED_CATEGORIES=("CHANGE_ME" "CHANGE_ME")

# The number of days a torrent should seed before it's eligible for deletion
SEEDING_DAYS_REQUIRED=10

# ------------------------------------------------------------------------------------------------- #
# -----------------------------------------Torrent Checks------------------------------------------ #
# ------------------------------------------------------------------------------------------------- #
# NOTE: If all the checks are turned off, the script will attempt to delete all torrents

# The check to skip if the torrent is not in a managed category
MANAGED_CHECK=true

# The check to skip hardlinked torrents
HARDLINK_CHECK=true

# The check to skip if the torrent hasn't seeded for the required number of days
SEEDING_CHECK=true

# ------------------------------------------------------------------------------------------------- #
# -------------------------------Define colours for console output--------------------------------- #
# ------------------------------------------------------------------------------------------------- #
# No Color
NC='\033[0m'

# Warning messages
WARNING='\033[38;5;160m'

# Informational messages
INFO='\033[38;5;27m'

# Torrent names
NAME='\033[38;5;45m'

# Torrent details
DETAIL='\033[38;5;23m'

# Torrent values
VALUE='\033[38;5;156m'