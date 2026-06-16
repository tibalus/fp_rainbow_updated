# Modification pour faire fonctionner FP Rainbow

## *docker-compose.yml* (1_Fingerprint_Collection/app/database)

### Suppression de la ligne user maintenant inutile

```
version: "3"
services:
  postgres:
    container_name: postgres
    image: postgres
    // user: "${UID}"             Suppression de la ligne
    ports:
      - "${PG_PORT}:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${PG_USER}
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: ${PG_DATABASE}
  
  adminer:
    image: adminer
    restart: unless-stopped
    depends_on: 
      - postgres
    ports:
      - 8032:8080

networks:
  default:
    name: fp-docker


```

## *DockerFile_headful* (1_Fingerprint_Collection/app/client) 

### Modification de la version de node

```
FROM node:20-bookworm-slim      //Modification de la version node de node16 -> node:20-bookworm-slim

#RUN apt-get update && apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget xvfb
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && apt-get update \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 libgdk-pixbuf2.0-0 libgtk-3-0 libasound2 ca-certificates fonts-liberation libappindicator3-1 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 lsb-release xdg-utils xvfb x11-xserver-utils dbus-x11 --no-install-recommends

#RUN service dbus start
#RUN groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser

#USER pptruser

WORKDIR /home/pptruser
COPY package.json /home/pptruser
RUN npm install
COPY . /home/pptruser
ENV DISPLAY=:99
```

## *DockerFile_headless* (1_Fingerprint_Collection/app/client) 

### Modification de la version de node + utilisation de package.json

```
FROM node:20-bookworm-slim    //Modification de la version node de node16 -> node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && apt-get update \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 libgdk-pixbuf2.0-0 libgtk-3-0 libasound2 ca-certificates fonts-liberation libappindicator3-1 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxtst6 lsb-release xdg-utils\
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser

WORKDIR /home/pptruser
COPY --chown=pptruser:pptruser package.json /home/pptruser/      //Utilisation de package.json pour la gestion de pacquets

USER pptruser

RUN npm install
```


## *multiple-browser.sh* (1_Fingerprint_Collection/app/client) 

```
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
        	docker stop ${container_name} "${container_name}_headless" || true # Added || true to prevent script exiting if stop fails
    	docker rm ${container_name} "${container_name}_headless" || true  # Added || true to prevent script exiting if rm fails for non-existent container
        fi
    echo $container_name
    if [[ "$container_name" == "chrome_linux_128_0_6613_36" || "$container_name" == "chrome_linux_129_0_6666_0" || "$container_name" == "chrome_linux_130_0_6710_0" ]]; then
        docker run --name "${container_name}_headless" --env "CONTAINER_NAME=${container_name}" -v "${DOCKER_BUILD}/browsers/${browser_folder}:/chromium" -v "${DOCKER_CLIENT}/puppeteer-switch-jsta-fpjs.js:/home/pptruser/puppeteer.js:ro" -v "${DOCKER_CLIENT}/get_systeminformation.js:/home/pptruser/get_systeminformation.js:ro" -v "${DOCKER_DATABASE}/.env:/home/database/.env:ro" -v "${DOCKER_CLIENT}/data:/home/pptruser/data" --network fp-docker -d puppeteer-xvfb:latest sh -c "Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp & node /home/pptruser/puppeteer.js --headless-new"
    else
        docker run --name "${container_name}_headless" --env "CONTAINER_NAME=${container_name}" -v "${DOCKER_BUILD}/browsers/${browser_folder}:/chromium" -v "${DOCKER_CLIENT}/puppeteer-switch-jsta-fpjs.js:/home/pptruser/puppeteer.js:ro" -v "${DOCKER_CLIENT}/get_systeminformation.js:/home/pptruser/get_systeminformation.js:ro" -v "${DOCKER_DATABASE}/.env:/home/database/.env:ro" -v "${DOCKER_CLIENT}/data:/home/pptruser/data" --network fp-docker -d puppeteer-xvfb:latest sh -c "Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp & node /home/pptruser/puppeteer.js --headless"
    fi
    docker run --name "${container_name}" --env "CONTAINER_NAME=${container_name}" -v "${DOCKER_BUILD}/browsers/${browser_folder}:/chromium" -v "${DOCKER_CLIENT}/puppeteer-switch-jsta-fpjs.js:/home/pptruser/puppeteer.js:ro" -v "${DOCKER_CLIENT}/get_systeminformation.js:/home/pptruser/get_systeminformation.js:ro" -v "${DOCKER_DATABASE}/.env:/home/database/.env:ro" -v "${DOCKER_CLIENT}/data:/home/pptruser/data" --network fp-docker -e "DISPLAY=:99" -e "QT_X11_NO_MITSHM=1" -d puppeteer-xvfb:latest sh -c "Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp & node /home/pptruser/puppeteer.js"
done
```

## *package.json* (1_Fingerprint_Collection/app/client) 

### Modification des versions des dépendances

```
{
  "dependencies": {
    "dotenv": "^16.4.5",
    "pg": "^8.13.0",
    "puppeteer-core": "^23.9.0",
    "uuid": "^11.0.3",
    "systeminformation": "^5.23.5"
  }
}
```

## *prep.sh* (1_Fingerprint_Collection/app/pre) 

### Suppression des dépendences inutiles

```
#!/bin/sh
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'
MSG_ERRO="[${RED}erro${NC}]"
MSG_INFO="[${GREEN}info${NC}]"
MSG_WARN="[${YELLOW}warn${NC}]"

# Check dependencies
dependencies="npm docker docker-compose node tar"      //Suppression de wget

for dep in $dependencies
do
    if ! command -v $dep >/dev/null 2>&1
    then
        printf "${MSG_ERRO} Command %s is not available. Please install it and try again.\n" "$cmd"
        exit 1
    else
        printf "${MSG_INFO} Command %s is available.\n" "$dep"
    fi
done

if ! docker ps >/dev/null 2>&1
then
    printf "${MSG_ERRO} The current user does not have permissions to run Docker. Please add the user to the Docker group or use sudo.\n"
    exit 1
else
    printf "${MSG_INFO} The current user has permissions to run Docker.\n"
fi

printf "${MSG_INFO} All dependencies are satisfied and the user can run Docker.\n"

# Installation
echo "${MSG_INFO} Create data directory"
mkdir -p ../database/data/postgres
mkdir -p ../client/data/
mkdir -p ../server/fpjs/data
mkdir -p ../server/jsta/data

echo "${MSG_INFO} Prepare node"
npm install
cd ../server/jsta
npm install
cd ../fpjs
npm install
cd ../../client
npm install
cd ../pre

printf "${MSG_INFO} Build docker images\n"
cd ../client
if ! docker build -t puppeteer-fp-tester . -f Dockerfile_headless; then
    printf "${MSG_ERRO} Failed to build Docker image puppeteer-fp-tester\n"
    exit 1
fi
if ! docker build -t puppeteer-xvfb . -f Dockerfile_headful; then
    printf "${MSG_ERRO} Failed to build Docker image puppeteer-xvfb\n"
    exit 1
fi

echo "${MSG_INFO}  Prepare database"
echo "${MSG_INFO}  Run database"
cd ../database/
docker-compose up -d
cd ../pre
sleep 10
echo "${MSG_INFO} Run node for db"
node init_db.js
node export_switch_to_db.js
node export_flag_to_db.js

echo "${MSG_INFO} Run web server"
cd ../server
docker-compose up -d

echo "${MSG_INFO} Everything done"
echo "${MSG_INFO} To start the experimentation, run the .sh script in ../client"

```


