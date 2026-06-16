#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Convert paths for Docker on Windows (MINGW/Git Bash)
if command -v cygpath &> /dev/null; then
    # Use cygpath if available (Git Bash on Windows)
    DOCKER_CLIENT="$(cygpath -w "$(pwd)")"
    DOCKER_BUILD="$(cygpath -w "$(cd ../build && pwd)")"
    DOCKER_DATABASE="$(cygpath -w "$(cd ../database && pwd)")"
elif [[ "$(uname -s)" == MINGW* ]] || [[ "$(uname -s)" == MSYS* ]]; then
    # Fallback for MINGW without cygpath
    DOCKER_CLIENT="$(pwd -W 2>/dev/null || pwd)"
    DOCKER_BUILD="$(cd ../build && pwd -W 2>/dev/null || pwd)"
    DOCKER_DATABASE="$(cd ../database && pwd -W 2>/dev/null || pwd)"
    cd "$SCRIPT_DIR"
else
    # Linux/Mac
    DOCKER_CLIENT="$(pwd)"
    DOCKER_BUILD="$(cd ../build && pwd)"
    DOCKER_DATABASE="$(cd ../database && pwd)"
    cd "$SCRIPT_DIR"
fi

echo "DOCKER_CLIENT: $DOCKER_CLIENT"
echo "DOCKER_BUILD: $DOCKER_BUILD"

executable_path="../build/browsers/${1}*/"

for d in ${executable_path} ; do
    [ -L "${d%/}" ] && continue
    browser_folder="$(basename "${d%/}")"
    container_name=`echo "$browser_folder" | sed 's/[^a-zA-Z0-9]/_/g'`
    echo -e "Run : \e[1m${container_name}\e[0m"
    if docker ps -a | awk '{print $NF}' | grep -qE "^${container_name}$|^${container_name}_headless$"; then
	echo -e "	Remove existing container \e[1m${container_name}\e[0m"
    	docker stop ${container_name} "${container_name}_headless"
	docker rm ${container_name} "${container_name}_headless"
docker rm "${container_name}_headless"
    fi
    echo $container_name
    if [[ "$container_name" == "chrome_linux_128_0_6613_36" || "$container_name" == "chrome_linux_129_0_6666_0" || "$container_name" == "chrome_linux_130_0_6710_0" ]]; then
        docker run --name "${container_name}_headless" --env "CONTAINER_NAME=${container_name}" -v "${DOCKER_BUILD}/browsers/${browser_folder}:/chromium" -v "${DOCKER_CLIENT}/puppeteer-switch-jsta-fpjs.js:/home/pptruser/puppeteer.js:ro" -v "${DOCKER_CLIENT}/get_systeminformation.js:/home/pptruser/get_systeminformation.js:ro" -v "${DOCKER_DATABASE}/.env:/home/database/.env:ro" -v "${DOCKER_CLIENT}/data:/home/pptruser/data" --network fp-docker -d puppeteer-xvfb:latest sh -c "Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp & node /home/pptruser/puppeteer.js --headless-new"
    else
        docker run --name "${container_name}_headless" --env "CONTAINER_NAME=${container_name}" -v "${DOCKER_BUILD}/browsers/${browser_folder}:/chromium" -v "${DOCKER_CLIENT}/puppeteer-switch-jsta-fpjs.js:/home/pptruser/puppeteer.js:ro" -v "${DOCKER_CLIENT}/get_systeminformation.js:/home/pptruser/get_systeminformation.js:ro" -v "${DOCKER_DATABASE}/.env:/home/database/.env:ro" -v "${DOCKER_CLIENT}/data:/home/pptruser/data" --network fp-docker -d puppeteer-xvfb:latest sh -c "Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp & node /home/pptruser/puppeteer.js --headless"
    fi
    docker run --name "${container_name}" --env "CONTAINER_NAME=${container_name}" -v "${DOCKER_BUILD}/browsers/${browser_folder}:/chromium" -v "${DOCKER_CLIENT}/puppeteer-switch-jsta-fpjs.js:/home/pptruser/puppeteer.js:ro" -v "${DOCKER_CLIENT}/get_systeminformation.js:/home/pptruser/get_systeminformation.js:ro" -v "${DOCKER_DATABASE}/.env:/home/database/.env:ro" -v "${DOCKER_CLIENT}/data:/home/pptruser/data" --network fp-docker -e "DISPLAY=:99" -e "QT_X11_NO_MITSHM=1" -d puppeteer-xvfb:latest sh -c "Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp & node /home/pptruser/puppeteer.js"
done

