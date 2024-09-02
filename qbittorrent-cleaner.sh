#!/bin/bash
source $(dirname "$0")/config.sh

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

# Build a set of all torrent paths
declare -A torrent_paths
echo -e "${INFO}Building set of all torrent paths${NC}"
for row in $(echo $json | jq -r '.[] | @base64'); do
    torrent=$(echo $row | base64 --decode)
    torrent_path=$(echo $torrent | jq -r '.content_path' | sed "s|$RELATIVE_PATH|$ABSOLUTE_PATH|")
    torrent_paths["$torrent_path"]=1
    echo -e "${INFO} - ${NAME}$torrent_path${NC}"
done

# Declare list of directories to delete
declare -a directories_to_delete

# Iterate over managed categories
for category in "${MANAGED_CATEGORIES[@]}"; do
    category_path="$ABSOLUTE_PATH$CATEGORIES_PATH/$category"
    echo -e "${INFO}Checking category ${VALUE}$category${INFO} at ${VALUE}$category_path${NC}"
    if [ ! -d "$category_path" ]; then
        echo -e "${INFO}Category ${VALUE}$category${INFO} does not exist${NC}"
        continue
    fi

    # Iterate over files and directories in the category
    for item in "$category_path"/*; do
        if [ -e "$item" ]; then
            # Check if item is associated with any torrent
            echo -e "${INFO}Checking ${NAME}$item${NC}"
            if [[ -z "${torrent_paths["$item"]}" ]]; then
                echo -e "${WARNING}Not associated with any torrent${NC}"
                directories_to_delete+=("$item")
            else
                echo -e "${INFO}Associated with a torrent${NC}"
            fi
        fi
    done
done

# Check if there are directories to delete
if [ ${#directories_to_delete[@]} -eq 0 ]; then
    echo -e "${INFO}No directories to delete${NC}"
    exit
fi

# Print list of directories to delete
echo -e "${WARNING}Deleting:${NC}"
for dir in "${directories_to_delete[@]}"; do
    echo -e "${WARNING} - ${NAME}$dir${NC}"
done

if $AUTO_YES; then
    REPLY="y"
else
    # Confirm deletion
    echo -en "${WARNING}Are you sure you want to delete these directories? [y/N] ${NC}"
    read -n 1 -r
    echo
fi

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Delete directories
    rm -rf "${directories_to_delete[@]}"
    echo -e "${INFO}Done${NC}"
fi