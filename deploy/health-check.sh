#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8080/health
printf '\n'
docker inspect --format 'Container status: {{.State.Status}}; restart count: {{.RestartCount}}' crewline
df -h .
python3 - <<'PY'
from pathlib import Path
import time,shutil
copies=list(Path('backups').glob('daily-*.sqlite'))
if not copies or time.time()-max(p.stat().st_mtime for p in copies)>48*3600:raise SystemExit('WARNING: no daily backup from the last 48 hours')
u=shutil.disk_usage('.')
if u.free<2*1024**3:raise SystemExit('WARNING: less than 2 GiB disk space free')
print('Recent backup found; disk reserve OK. Copy a backup off this machine too.')
PY
