#!/usr/bin/env bash
set -euo pipefail
# Offline administrator command. Needs root to read the protected service env file.
if [ "$(id -u)" != 0 ]; then echo 'Run with sudo.' >&2; exit 1; fi
set -a
source /etc/crewline.env
set +a
# Node admin opens the SQLite file as the service user to preserve file permissions.
runuser -u crewline -- env DB_PATH="$DB_PATH" node /opt/crewline/admin.mjs invite
