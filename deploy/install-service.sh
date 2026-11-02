#!/usr/bin/env bash
# Debian/Ubuntu with systemd, Node 24 already installed and available system-wide.
set -euo pipefail
if [ "$(id -u)" != 0 ]; then echo 'Run with sudo.' >&2; exit 1; fi
if [ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 24 ]; then echo 'Install Node.js 24 or newer first.' >&2; exit 1; fi
cd "$(dirname "$0")"
getent passwd crewline >/dev/null || useradd --system --home /var/lib/crewline --shell /usr/sbin/nologin crewline
install -d -m 755 /opt/crewline
install -m 644 ../server/*.mjs ../server/cameras.json /opt/crewline/
if [ ! -f /etc/crewline.env ]; then
 (umask 077; printf 'ADMIN_KEY=%s\nDB_PATH=/var/lib/crewline/crewline.sqlite\nHOST=127.0.0.1\nPORT=8080\n' "$(openssl rand -hex 32)" > /etc/crewline.env)
fi
install -m 644 crewline.service /etc/systemd/system/crewline.service
systemctl daemon-reload
systemctl enable --now crewline
systemctl restart crewline
printf '\nInstalled. View logs: sudo journalctl -u crewline -f\nNext: configure HTTPS using the included Caddyfile example.\n'
