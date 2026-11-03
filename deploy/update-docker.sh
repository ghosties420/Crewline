#!/usr/bin/env bash
# Upgrade the existing v1.0/v1.1 container; retain its data volume, env file, and Tailscale setup.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -s deploy/docker.env ]; then echo 'Missing deploy/docker.env. Run this inside your existing Crewline project folder.' >&2; exit 1; fi
volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' crewline)"
if [ "$volume" != crewline-data ]; then echo 'Unexpected data volume. Stopping without modifying the container.' >&2; exit 1; fi
old_image="$(docker inspect --format '{{.Image}}' crewline)"
# Build before stopping the current service.
docker build -t crewline:1.6 -f deploy/Dockerfile .
backup_name="pre-1.6-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
docker exec crewline node admin.mjs backup "/data/$backup_name"
mkdir -p backups
chmod 700 backups
docker cp "crewline:/data/$backup_name" "backups/$backup_name"
chmod 600 "backups/$backup_name"
docker stop crewline
docker rm crewline
if ! docker run -d --name crewline --restart unless-stopped --env-file deploy/docker.env -p 127.0.0.1:8080:8080 -v crewline-data:/data --log-opt max-size=10m --log-opt max-file=3 crewline:1.6; then
 echo "Container start failed. Backup: backups/$backup_name. Previous image: $old_image. Do not run old software against a migrated database." >&2
 exit 1
fi
for attempt in $(seq 1 20); do
 if curl -fsS http://127.0.0.1:8080/health; then printf '\nUpgrade ready. Install the 1.6 APK over your existing app. Your server URL is unchanged.\n'; exit 0; fi
 sleep 1
done
echo 'Health check failed. Stopping the new service to preserve data. Inspect logs and the backup before recovery.' >&2
docker logs --tail 40 crewline
docker stop crewline
echo "Backup: backups/$backup_name. Previous image: $old_image" >&2
exit 1
