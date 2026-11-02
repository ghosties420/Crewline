#!/usr/bin/env bash
# Replaces the database with a chosen snapshot. Requires explicit operator flag.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" != 2 ] || [ "$2" != --confirm-restore ]; then echo 'Usage: sudo bash deploy/restore-docker.sh /absolute/backup.sqlite --confirm-restore' >&2; exit 1; fi
backup="$(realpath "$1")"
if [ ! -f "$backup" ]; then echo 'Backup not found.' >&2; exit 1; fi
python3 - "$backup" <<'PY'
import sqlite3,sys
with sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True) as db:
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    db.execute('SELECT id FROM users LIMIT 1').fetchall()
print('Snapshot validated. Current database will be backed up, then replaced.')
PY
volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' crewline)"
if [ "$volume" != crewline-data ]; then echo 'Unexpected volume; stopping.' >&2; exit 1; fi
image="$(docker inspect --format '{{.Image}}' crewline)"
bash deploy/docker-backup.sh
docker stop crewline
# The helper runs as root only to read a private host backup; resulting data belongs to node.
docker run --rm --user root -v crewline-data:/data -v "$backup:/restore.sqlite:ro" --entrypoint node "$image" -e '
const fs=require("node:fs");fs.copyFileSync("/restore.sqlite","/data/restore.tmp");fs.chownSync("/data/restore.tmp",1000,1000);fs.chmodSync("/data/restore.tmp",0o600);for(const suffix of ["-wal","-shm"])try{fs.unlinkSync("/data/crewline.sqlite"+suffix)}catch(e){if(e.code!=="ENOENT")throw e}fs.renameSync("/data/restore.tmp","/data/crewline.sqlite");'
docker start crewline
printf 'Restored. Accounts/messages created after the snapshot are no longer present. Run deploy/health-check.sh.\n'
