#!/usr/bin/env bash
set -euo pipefail
if [ "$#" != 1 ]; then echo 'Supply one new absolute backup filename.' >&2; exit 1; fi
umask 077
python3 - "$1" <<'PY'
import sqlite3,sys,os
path=sys.argv[1]
if not os.path.isabs(path):raise SystemExit('Use an absolute backup filename')
fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
with sqlite3.connect('file:/var/lib/crewline/crewline.sqlite?mode=ro',uri=True) as source, sqlite3.connect(path) as target:
    source.backup(target)
print('Consistent backup complete. Keep it private: it contains crew data.')
PY
