# Crewline 1.4 — Android pilot update

## Install on your current Linux Mint server

Download `crewline-server-and-source-1.4.zip` into Downloads. Run:

```bash
unzip -o ~/Downloads/crewline-server-and-source-1.4.zip -d ~/Applications
cd ~/Applications/crewline-android
sudo bash deploy/update-docker.sh
curl http://127.0.0.1:8080/health
```

Expected health: `{"ok":true,"version":"1.4.0","protocol":4}`.

The updater builds the new image first, takes a database backup, then replaces the container. It retains `crewline-data`, your existing `deploy/docker.env` and localhost binding. It does not change Tailscale or make the server public. If the update fails, keep the displayed backup and logs; do not run older software against the migrated database.

Install `crewline-android-1.4.apk` over the existing app on each phone, without uninstalling it. This APK uses the same pilot signing key as the earlier downloads. If you built a release with your own signing key, build this source with that same key instead.

Your server address remains:

https://YOUR-SERVER.tailnet-name.ts.net

## What changed

- Five fixed navigation tabs: Map, Community, Convoys, Social and More. Garage, Explore, convoy updates and Settings are under More.
- Refined dark theme, larger touch targets, navigation icons, readable spacing, focus indicators and clearer empty states. Zoom is no longer disabled by the page viewport.
- Compact convoy cards and a separate detail sheet; filters for active, joined, public and finished drives.
- Organisers can edit the title, meeting/destination labels, notes and departure time. Pins and visibility do not change in this editor. Plan edits clear ready status and generate participant updates.
- Organisers can remove participants and later allow them to rejoin. Removal revokes convoy membership and therefore radio access; it does not hide a public plan from that person.
- Convoy updates for edits, drive start and finish. Read them in More → Convoy updates. Updates are kept for 30 days, with the latest 100 shown. Marking read affects only your own updates.
- Optional Android background listener also alerts about convoy updates. Enable background alerts in Social. It needs the app service, notification permission and server connection to remain available. This is polling, not guaranteed push delivery; force-stop or reboot stops it.
- Centre on me obtains a fresh GPS fix without enabling crew sharing. Planning form text survives going back to change pins.
- Dialog errors appear inside the dialog. Repeated login attempts are limited per account, with an additional global password-hashing limit. This is not a replacement for public-ingress abuse controls.

Existing crew events, cross-crew event invitations, public events, message board, private/crew chat and calls, photos, cameras, exploration and convoy radio remain included. Android only; no purchases or subscriptions were added.

## Validation completed here

- Android APK compiled; v2/v3 signature verification passed.
- Automated API tests cover legacy behaviour and migrations, plus organiser-only edits/removal, rejoin prevention, radio-access revocation, update-recipient/read isolation and account-specific authentication throttling.
- Browser interaction test covers signup, vehicles/photos, convoy pin planning, readiness/radio controls, editing, narrow navigation, maps/camera markers, exploration, profile settings, board/messages/calls, events and moderation dashboard. Native microphone, GPS, permissions and image picking are mocked; map tile traffic is blocked in this test.
- Java voice transport/codec integration test and local synthetic read-load check. The load check uses empty accounts and does not establish real community capacity.

## What still needs doing before public launch

This is a test-signed pilot, not a public-launch certification. I have not deployed it to your machine or tested physical phones.

1. Test two Android phones on different mobile networks: login, photo uploads, call/radio audio, screen lock, permissions, Bluetooth routing, network loss/recovery and updates. In particular, confirm PTT stops transmitting after release, app switching and interruptions. The current radio has no exclusive single-speaker floor or Bluetooth hardware-button integration.
2. Generate and protect your own production signing key with `android/build-release.sh`. Changing away from the pilot key requires a deliberate installation migration. Decide your distribution channel; the existing build produces an APK, not a Play-ready app bundle.
3. Review authentication, media handling, WebView bridge, relay and private-data access independently. Set public-ingress source throttling/bot protection appropriate to your proxy. Account and global limits alone cannot prevent all denial of service.
4. Set up named moderators, reachable privacy/support contact, rules and an abuse-response process. Current blocking protects direct contact/location markers; shared public content is not comprehensively filtered. Convoy participant approval and speaker management remain future work.
5. Install supplied backup/health timers, store encrypted backups off the laptop and rehearse a restore. Existing health checks log locally; external downtime alerting still needs a chosen destination/service. Keep the host awake and measure upload bandwidth under real voice/photo traffic.
6. Choose public access and map hosting suitable for the expected audience. Current Tailscale Serve is private. Public OSM tiles are not an unlimited nationwide hosting service. No domain, hosting or third-party service was purchased or activated.
7. Maintain/review the NZ camera dataset and its permissions. The bundled snapshot has 133 published fixed records, source date 2026-10-01; completeness, mobile cameras and enforcement direction are not guaranteed. There is no new camera data in this release.
8. Assess feed/storage limits and pagination before growing beyond a local pilot. The server still has bounded crew/event/convoy listings, 100 members per convoy and 8 simultaneous voice participants.
9. Publish privacy/deletion/support information matching actual practice. Voice is transported over TLS via the server; it is not end-to-end encrypted.

Other features still not implemented: convoy-only live location sharing, dedicated convoy text chat, place search, driving-route previews, offline map downloads, average-speed corridor calculations, scheduled reminders and event rescheduling. Existing live sharing is scoped to the selected crew, not public convoy membership.

## Suggested first phone test

Create a public convoy with two accounts. Join from phone B and mark ready. On phone A, change departure/notes: B should receive an update and lose ready status. Remove B: B must be unable to rejoin or use the radio. Allow B back, rejoin, then test hold/release voice and both navigation buttons while stationary.
