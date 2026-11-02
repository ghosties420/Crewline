#!/usr/bin/env bash
# Online SQLite snapshot. Photos and accounts are included. Keep backups private.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
name="daily-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
docker exec crewline node admin.mjs backup "/data/$name"
docker cp "crewline:/data/$name" "backups/$name"
# Validate the copied database before deleting the temporary copy or rotating.
python3 - "backups/$name" <<'PY'
import sqlite3,sys
with sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True) as db:
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
print('Backup integrity verified.')
PY
docker exec crewline node -e 'require("node:fs").unlinkSync(process.argv[1])' "/data/$name"
python3 - <<'PY'
from pathlib import Path
for p in sorted(Path('backups').glob('daily-*.sqlite'),reverse=True)[14:]:p.unlink()
PY
printf 'Saved %s/backups/%s\n' "$PWD" "$name"
