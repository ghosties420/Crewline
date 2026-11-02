#!/usr/bin/env bash
# Requires an existing Docker installation; does not change host firewall rules.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f deploy/docker.env ]; then
 (umask 077; printf 'ADMIN_KEY=%s\n' "$(openssl rand -hex 32)" > deploy/docker.env)
fi
docker build -t crewline:1.3 -f deploy/Dockerfile .
docker volume create crewline-data >/dev/null
docker run -d --name crewline --restart unless-stopped --env-file deploy/docker.env -p 127.0.0.1:8080:8080 -v crewline-data:/data --log-opt max-size=10m --log-opt max-file=3 crewline:1.3
printf '\nConfigure HTTPS using the Caddyfile example. Create an invitation:\ndocker exec crewline node admin.mjs invite\n'
