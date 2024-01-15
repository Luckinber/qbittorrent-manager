#!/bin/bash
source config.sh

# Declare list of torrents to delete
declare -a torrents_to_delete
declare -a hashes_to_delete
declare -a directories_to_delete

if [[ $1 == "-y" ]]; then
    AUTO_YES=true
else 
    AUTO_YES=false
fi

# Check if config.sh has been configured
if [ "$USERNAME" == "CHANGE_ME" ] || [ "$PASSWORD" == "CHANGE_ME" ] || [ "$RELATIVE_PATH" == "CHANGE_ME" ] || [ "$ABSOLUTE_PATH" == "CHANGE_ME" ] || [ "$MANAGED_CATEGORIES" == "CHANGE_ME" ]; then
	echo -e "${WARNING}Please configure config.sh before running this script${NC}"
	exit
fi

# Authenticate
cookie=$(curl -is "$HOST/api/v2/auth/login" --data "username=$USERNAME&password=$PASSWORD" | grep 'set-cookie' | awk '{print $2}')
if [ -z "${cookie}" ]; then
	echo -e "${WARNING}Authentication failed${NC}"
	exit
fi

# Get all torrents
response=$(curl -s "$HOST/api/v2/torrents/info" --cookie "$cookie" --data "sort=name")
# Parse JSON response
json=$(echo $response | jq -r)

# Iterate over torrent objects in base64 so that we can handle names with spaces
for row in $(echo $json | jq -r '.[] | @base64'); do
    # Parse torrent object back to unicode
    torrent=$(echo $row | base64 --decode)
    # Get torrent info
    torrent_hash=$(echo $torrent | jq -r '.hash') # Torrent hash
    torrent_name=$(echo $torrent | jq -r '.name') # Torrent name
    torrent_category=$(echo $torrent | jq -r '.category') # Torrent category
    torrent_path=$(echo $torrent | jq -r '.content_path' | sed "s|$RELATIVE_PATH|$ABSOLUTE_PATH|") # Relative path replaced with absolute path
    torrent_seeding_time=$(echo $torrent | jq -r '.seeding_time') # Torrent seeding time in seconds

    # Check if torrent category is managed
    if [[ ! " ${MANAGED_CATEGORIES[@]} " =~ " $torrent_category " ]]; then
        echo -e "${INFO}Skipping ${NAME}$torrent_name${NC}"
        echo -e "${DETAIL}   Unmanaged category: ${VALUE}$torrent_category${NC}"
        continue
    fi
    # Check if torrent contains files with more than one hard link
    if [ $(find "$torrent_path" -type f -links +1 2>/dev/null | wc -l) -gt 0 ]; then
        echo -e "${INFO}Skipping ${NAME}$torrent_name${NC}"
        echo -e "${DETAIL}   Contains files with more than one hard link in: ${VALUE}$torrent_path${NC}"
        continue 
    fi
    # Check if torrent had been seeding for more than 10 days
    if (( $torrent_seeding_time < 60*60*24*$SEEDING_DAYS_REQUIRED )); then
        echo -e "${INFO}Skipping ${NAME}$torrent_name${NC}"
        echo -e "${DETAIL}   Seeding for less than $SEEDING_DAYS_REQUIRED days: ${VALUE}$(( $torrent_seeding_time / 60 / 60 / 24 )) days${NC}"
        continue
    fi

    # Add torrent to list of torrents to delete
    torrents_to_delete+=("$torrent_name")
    hashes_to_delete+=("$torrent_hash")
    directories_to_delete+=("$torrent_path")
done

# Check if there are torrents to delete
if [ ${#torrents_to_delete[@]} -eq 0 ]; then
    echo -e "${INFO}No torrents to delete${NC}"
    exit
fi

# Print list of torrents to delete
echo -e "${WARNING}Deleting:${NC}"
for index in ${!hashes_to_delete[@]}; do
	echo -e "${WARNING} - ${NAME}${torrents_to_delete[$index]} ${DETAIL}in ${VALUE}${directories_to_delete[$index]}${NC}"
done

if $AUTO_YES; then
    REPLY="y"
else
    # Confirm deletion
    echo -en "${WARNING}Are you sure you want to delete these torrents? [y/N] ${NC}"
    read -n 1 -r
    echo
fi

# Make list of hashes to delete "|" delimited
hashes_to_delete=$(printf "|%s" "${hashes_to_delete[@]}")

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Delete torrents
    curl -s --data "hashes=${hashes_to_delete:1}&deleteFiles=false" -X POST "$HOST/api/v2/torrents/delete" --cookie "$cookie"
	for index in ${!torrents_to_delete[@]}; do
		# Delete directory
		rm -rf ${directories_to_delete[$index]}
	done
    echo -e "${INFO}Done${NC}"
fi