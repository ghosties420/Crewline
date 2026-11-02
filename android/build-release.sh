#!/usr/bin/env bash
# Create a private signing identity on YOUR machine. Never include it in source archives.
set -euo pipefail
cd "$(dirname "$0")"
umask 077
key_dir="${CREWLINE_KEY_DIR:-$HOME/.local/share/crewline-signing}"
mkdir -p "$key_dir"
export CREWLINE_KEYSTORE="$key_dir/release.keystore"
export CREWLINE_KEY_ALIAS=crewline
read -r -s -p 'Private signing-key password (12+ characters): ' CREWLINE_STORE_PASSWORD
printf '\n'
if [ "${#CREWLINE_STORE_PASSWORD}" -lt 12 ]; then echo 'Use at least 12 characters.' >&2; exit 1; fi
export CREWLINE_STORE_PASSWORD
if [ ! -f "$CREWLINE_KEYSTORE" ]; then
 keytool -genkeypair -keystore "$CREWLINE_KEYSTORE" -alias crewline -keyalg RSA -keysize 3072 -validity 10000 -storepass:env CREWLINE_STORE_PASSWORD -keypass:env CREWLINE_STORE_PASSWORD -dname 'CN=Crewline Community Release'
fi
bash build-apk.sh
unset CREWLINE_STORE_PASSWORD
printf 'Back up %s securely. This production-signed APK cannot update an installation signed with the old test key.\n' "$CREWLINE_KEYSTORE"
