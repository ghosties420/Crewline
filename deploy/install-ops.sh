#!/usr/bin/env bash
# Install optional daily backup and 5-minute health checks for the existing Docker setup.
set -euo pipefail
if [ "$(id -u)" != 0 ]; then echo 'Run with sudo.' >&2; exit 1; fi
cd "$(dirname "$0")/.."
root="$PWD"
# systemd ExecStart quoting: reject characters that need complex escaping.
case "$root" in *[!a-zA-Z0-9_./-]*) echo 'Use an installation path without spaces or special characters.' >&2; exit 1;; esac
for job in backup health; do
 script=docker-backup.sh
 if [ "$job" = health ]; then script=health-check.sh; fi
 cat > "/etc/systemd/system/crewline-$job.service" <<UNIT
[Unit]
Description=Crewline $job
After=docker.service
Requires=docker.service
[Service]
Type=oneshot
ExecStart=/bin/bash $root/deploy/$script
UMask=0077
UNIT
done
cat > /etc/systemd/system/crewline-backup.timer <<'UNIT'
[Unit]
Description=Daily Crewline backup
[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=10m
[Install]
WantedBy=timers.target
UNIT
cat > /etc/systemd/system/crewline-health.timer <<'UNIT'
[Unit]
Description=Check Crewline every five minutes
[Timer]
OnBootSec=5m
OnUnitActiveSec=5m
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now crewline-backup.timer crewline-health.timer
systemctl start crewline-backup.service
printf 'Installed. Read results with: sudo journalctl -u crewline-health -u crewline-backup\nChecks log locally; no external alert delivery is configured.\n'
