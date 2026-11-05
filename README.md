# Crewline

Android car-community app with a self-hosted Node.js / SQLite server. Current source: **1.7.2**, pilot stage. No in-app purchases. iOS is not implemented.

- `android/`: Android client, bundled UI and build scripts.
- `server/`: API, data storage, community features and voice relay.
- `deploy/`: Linux / Docker setup, updates, backups and recovery.
- `tests/`: API, migration, browser and native transport checks.
- [Update guide](UPDATE-1.7.2.md): changes, installation and remaining launch work.

## Development checks

Use Node.js 24 or later with `node:sqlite` support:

```bash
node --test tests/*.test.mjs
```

Build the Android client with JDK 17 and Android SDK platform/build-tools 35 installed:

```bash
export ANDROID_SDK_ROOT=/path/to/android-sdk
bash android/build-apk.sh
```

**Signing keys are deliberately not in this repository.** A fresh development build generates a new local test key, which will not update the previously distributed pilot APK. Use your existing key for updates, or plan the switch to a private production key with `android/build-release.sh`. Keep signing keys backed up outside git.

GitHub source hosting does not enable automatic app or server updates. The in-app GitHub updater and release automation are not implemented yet. Do not expose a production server until the remaining security, operations and device checks are complete. The owner reports successful manual testing; automated validation and remaining limitations are documented in [TEST-REPORT.md](TEST-REPORT.md).

Third-party Leaflet licensing is included in `android/app/src/main/assets/LEAFLET-LICENSE`. Camera data has separate source/licensing information in the project documentation. No new licence for the project itself is assigned by this import.

## Previous setup and release documentation

# Latest release: Android 1.4

See [UPDATE-1.4.md](UPDATE-1.4.md) for installation, changes, validation and remaining public-launch work. Older release notes below are historical.

# Crewline 1.3 — convoy planner and internet radio

Update **both server and Android app** for this version. Save the source ZIP to Downloads on Mint:

```bash
unzip -o ~/Downloads/crewline-server-and-source-1.3.zip -d ~/Applications
cd ~/Applications/crewline-android
sudo bash deploy/update-docker.sh
curl http://127.0.0.1:8080/health
```

Expect server `1.3.0`, protocol `4`. Install `crewline-android-1.3.apk` over the existing app; keep the same account and private server address. The updater retains the data volume and makes a pre-upgrade backup. Existing convoys remain crew-only. No network exposure or signup settings change automatically.

## Plan a convoy

Convoys → Start convoy opens a map. Tap the meeting point or request a fresh location fix, then select the destination. Pins can be dragged. Add up to five optional stops in order, then enter the name, place labels, notes and departure time. Choose **Only my selected crew** or **Public — everyone signed in**. Individuals without a crew can create public convoys.

Start now creates a gathering convoy; Begin drive is a separate organiser action. Scheduling, joining and marking Ready to leave do not start tracking or voice. Public viewers see the plan and participant count; the roster becomes visible after joining. Navigate buttons open the installed maps app for the meeting, destination or one stop at a time. There is no address search or in-app driving-route calculation yet.

Event details include Create convoy for this event. The event title, meeting-place text and future date are prefilled; confirm the actual pins on the map. A private event can seed only a convoy for its host crew, preventing accidental public disclosure of its details. This version does not automatically invite all invited event crews into one private convoy.

## Convoy radio

Join a convoy, then tap **Convoy radio**. It uses the same self-hosted internet voice relay, with a maximum of eight connected participants. The microphone is muted initially. Hold Talk to transmit; release to listen. Release, pointer cancellation, loss of focus and a native 800 ms held-signal timeout stop transmission. Screen lock/app background keeps listening where Android permits, but talking requires returning to the foreground control. Speaker/earpiece and Leave radio controls are provided.

Radio membership requires current convoy membership and access. Leaving the convoy, losing private-crew access, or finishing/deleting the convoy revokes access. Audio permission is requested only on opening the channel, not on joining the convoy. Microphone capture remains active while connected, even when muted, so Android's microphone indicator may remain visible; muted audio is replaced by silence before transmission.

This is internet push-to-talk, not an offline radio or direct Bluetooth link between cars. Mobile data/Wi-Fi and access to the server are needed. Bluetooth car/headset audio may depend on Android routing; no dedicated Bluetooth routing selector or headset button integration is provided or tested. Use a passenger or test while parked. Simultaneous speakers can overlap: exclusive one-speaker-at-a-time floor control is not implemented. Calls are not app-level end-to-end encrypted and audio is not recorded by the service. Muted clients still consume voice-channel bandwidth.

GPS sharing remains the existing opt-in selected-crew feature. Public convoy participation does not expose anyone's live location; convoy-specific location sharing is a future feature.

## Before public launch

Read `PUBLIC-LAUNCH.md`. Private release signing, phone/network tests, security review, moderation operations, an off-machine backup/restore rehearsal and real hosting capacity checks remain necessary. The supplied APK is test-signed for upgrade compatibility. This is a pilot, not a nationwide production-readiness certification.

The following earlier-version documentation describes retained functionality; use the **1.3 commands above** for this upgrade:

# Camera map update — Android 1.2.1

Install `crewline-android-1.2.1.apk` over version 1.2. Your existing 1.2 server does not need an update. The source archive includes the unchanged 1.2 server and updated Android app.

Open **Map**. Cameras appear by default: **S** spot-speed, **R** red-light and **A** average-speed endpoint. Tap for the road, area, camera type and source date. Use **Hide cameras / Show cameras** or **View all cameras** to see the national overview. Visibility is remembered on the phone and is separate from audible alerts. The Explore tab retains its exploration fog without the camera overlay.

Markers use the same bundled/cached database as approach alerts, including updates downloaded from Settings. Currently 133 retrieved NZTA fixed locations; not a guarantee of all cameras. Mobile cameras, enforcement headings, speed limits and average-speed corridor routes are not supplied. Camera locations can display offline; background map tiles still need internet unless cached.

The following 1.2 setup guide still applies for first installation/server upgrades:

# Crewline 1.2 — Android community pilot

Original self-hosted car-community app. No purchases, ads, subscriptions, Google location dependency or paid voice API. This is a test-signed pilot build, not a validated nationwide production release.

## Upgrade your existing Linux Mint Docker installation

Save `crewline-server-and-source-1.2.zip` to Downloads:

```bash
unzip -o ~/Downloads/crewline-server-and-source-1.2.zip -d ~/Applications
cd ~/Applications/crewline-android
sudo bash deploy/update-docker.sh
curl http://127.0.0.1:8080/health
```

Expect version `1.2.0`, protocol `3`. The script builds before stopping, takes a consistent backup, retains `deploy/docker.env` and the `crewline-data` volume, and keeps the localhost-only port mapping. It does not publish your server. If the new service fails its health check it stops and prints the backup location. Do not run the old image against a migrated database: old positional INSERTs do not support the new columns. Restore a pre-upgrade snapshot before reverting software.

Install `crewline-android-1.2.apk` over the existing app. It uses the same test signing identity, so do not uninstall: exploration remains local to that installation. Update every phone. Accounts, garages and photos are preserved. Existing members, board posts, crew chat and convoys migrate into a private **Original crew**. Its first existing account becomes crew owner. Existing live locations and calls are stopped during migration.

Your address remains `https://YOUR-SERVER.tailnet-name.ts.net`. While using Tailscale Serve, each phone still needs authorised Tailscale access. No domain or port forwarding is required for this private pilot.

## Set yourself up as administrator

Use your **Crewline account display name**, not the Linux username:

```bash
sudo docker exec crewline node admin.mjs promote 'YOUR CREWLINE NAME'
```

Open Settings → Community admin dashboard. Set a real privacy/support contact. Enable public signup there when ready; this allows individual registration without an invite code but does **not** change network accessibility. Signup remains invite-only by default. An administrator can close signup again without affecting existing accounts.

For invite-only registration:

```bash
sudo docker exec crewline node admin.mjs invite
```

People create individual accounts. They then go to **Community → Find crews** to apply, or create a crew themselves. Membership approval never grants site moderation rights.

## Using the community

- **Events:** all signed-in people see public events. Individuals can host public events. Crew owners/organisers can host public or private crew events, with location, region, date, description, RSVPs and discussion. Times are entered/displayed in the phone's local timezone and stored as UTC timestamps.
- **Private events:** visible to the host crew and accepted invited crews. Pending invitations reveal the event details only to the invited crew's organisers. Those organisers accept or decline on behalf of their crew. Revoke/withdraw removes private-event access. A public event remains public regardless of invitation status.
- **Crew interaction:** organisers invite other crews to events; members of accepted crews can coordinate in the event discussion. That discussion shares neither the host's private chat nor its live locations. There is no separate persistent crew-to-crew chat channel in this version.
- **Find crews:** searchable names/regions, applications with an introduction, approval/decline, application withdrawal, membership list, organiser promotion, removal, ownership transfer and leaving/deleting a crew. A person can belong to up to 20 crews.
- **Active crew:** choose one in Social/My crews. Its board, chat, convoys, garage and map members appear. Switching crews stops location recording/sharing through the UI, and changing the server-side selection invalidates previous sharing tokens. Individual mode has no crew map sharing.
- **Voice:** direct and crew rooms, up to 8 joined participants per room, G.711 telephone-quality audio. No recording; not app-level end-to-end encryption. Tailscale/HTTPS protects network transport. Actual microphone/echo/Bluetooth/screen-lock behaviour requires device testing.
- **Profiles and cars:** one avatar and one photo per vehicle. Photos are resized/re-encoded on Android, removing metadata. Up to 20 vehicles per person; 450 KB per photo; a pilot server photo limit of approximately 100 MB blocks additional uploads when full. This is not an album feature.
- **Safety:** direct messages/calls default to people who share a crew. People can choose anyone or nobody. Blocking stops direct contact and hides the blocked person's live marker; shared crew discussions are not automatically hidden. Reports, account suspensions, content removal, moderator roles and an audit trail are available to site staff. Reported private text can be reviewed by moderators; these reviews are logged. Server operators have database access.
- **Recovery:** Settings → Generate recovery code. Save it outside the phone. The login recovery form resets the password using that one-use code, revokes sessions and stops sharing. Generate a fresh code after recovery. There is no email/SMS verification or recovery service. The local admin password-reset command remains available.
- **Background notifications:** optional persistent foreground listener; restart after reboot/force-stop. No cloud push. Camera, message and call notifications depend on Android permissions, battery behaviour and network availability where applicable.

## NZ fixed safety-camera alerts

Settings → Start camera alerts. This starts a visible location foreground service; location sharing is independent and off unless enabled separately. Camera alerts work from the bundled/cached database without internet. Map tiles still require a connection.

The dataset contains **133 retrieved published fixed-camera records**, source page updated **1 October 2026**, checked **1 November 2026**. It covers spot-speed, red-light and average-speed endpoint cameras. It is not a guarantee of every camera and excludes temporary/mobile deployments. NZTA does not supply enforcement direction or speed limits in this table.

Alerts require movement of at least 2 m/s, a GPS fix no older than 15 seconds, accuracy within 50 m, a decreasing distance, and proximity within 500 m. A camera rearms after moving beyond 1 km; alerts are spaced at least 10 seconds apart. The first fix alone does not establish approach. Phone GPS/scheduling can cause late or missed alerts. Parallel roads can produce false alerts. Average-speed alerts mark endpoints only; the app does not calculate corridor average speed. Follow posted limits everywhere.

Audible warnings use the **Approaching safety cameras** Android notification channel. Notification settings, silent/DND mode and audio routing can silence them. Test with a passenger before relying on the feature. Alerts do not require uploading your position.

Use Update camera database to download the host's current dataset. It does not scrape NZTA automatically. To publish a reviewed update, use the shape in `server/cameras.json`, then:

```bash
node server/import-cameras.mjs /absolute/path/reviewed.json --reviewed
cp server/cameras.json android/app/src/main/assets/cameras.json
sudo bash deploy/update-docker.sh
```

This validates coordinates/IDs and rejects a drop greater than 20% in record count. The previous dataset is saved beside it. Rebuild the Android APK to update its offline seed; installed apps can update from Settings without rebuilding.

Source: NZ Transport Agency Waka Kotahi, [fixed safety camera locations](https://www.nzta.govt.nz/travelling-on-our-roads/safety-cameras/about-safety-cameras/fixed-safety-camera-locations). Converted from the published table to JSON; surrounding prose/logos/photos not included. NZTA's [website terms](https://www.nzta.govt.nz/about-us/about-this-site) state CC BY-NC 4.0 for applicable material. Attribution and licence are included in the data and app. Recheck permissions before a commercial/sponsored use.

## Backups, monitoring and recovery

```bash
sudo bash deploy/install-ops.sh
sudo bash deploy/health-check.sh
sudo journalctl -u crewline-backup -u crewline-health
```

The optional timers run an online SQLite backup daily and health checks every five minutes. Snapshots contain accounts, photos and conversations. Keep them private. Backup copies are checked for SQLite integrity/foreign-key consistency; retain the newest 14 daily copies. Upgrade backups are separate and not automatically removed. Health checks test HTTP availability, container status, backup age and local disk reserve. They log locally; no email, pager or remote alert provider is configured.

**Copy backups to another disk/machine.** A backup on the same laptop does not protect against theft or drive failure. The privacy statement's 14-day backup description assumes the supplied schedule; disclose any longer/off-machine retention to members.

To restore a selected snapshot (overwrites newer live data after first backing up the current database):

```bash
sudo bash deploy/restore-docker.sh /absolute/path/backup.sqlite --confirm-restore
```

Restore should first be rehearsed against a disposable instance. The scripts have been syntax checked; Docker/systemd deployment and full operational restore have not been executed in this build environment. Restoring a backup can restore old account sessions and deleted data; review access and deletion requests after recovery.

## Public access without a domain or port forwarding

Do not add the whole community to your private tailnet. After a private pilot and release preparation, Tailscale Funnel can expose only Crewline over HTTPS so members do not need Tailscale:

```bash
sudo tailscale funnel --bg http://127.0.0.1:8080
sudo tailscale funnel status
```

This is an explicit **public exposure** command, not part of the installer. Follow Tailscale's enablement prompt if necessary. Serve and Funnel cannot occupy the same HTTPS port with different visibility. To return to private-only access:

```bash
sudo tailscale funnel --https=443 off
sudo tailscale serve --bg http://127.0.0.1:8080
```

[Funnel documentation](https://tailscale.com/docs/features/tailscale-funnel) describes non-configurable bandwidth limits. It is a candidate for a controlled pilot, not guaranteed nationwide voice capacity. Run the laptop continuously, prevent suspend, use a reliable connection, and measure the actual upload link and concurrent calls. A dedicated server/VPS and suitable map-tile service can be introduced later without changing the account model. No paid service has been purchased or deployed by this update.

## Public-release preparation

The downloadable APK is signed with the existing **public test key** for upgrade compatibility. Do not distribute that signing identity nationwide. Generate and keep a private production key on your own machine:

```bash
# Requires JDK 17 and Android SDK platform/build-tools 35.0.0.
export ANDROID_SDK_ROOT=/path/to/android-sdk
bash android/build-release.sh
```

The key is generated outside the project in `~/.local/share/crewline-signing`, protected by your entered password. Back it up separately. Never place it in the source ZIP. A different signature cannot update test-key installs: plan the production switch before inviting the wider community. Server accounts survive, but reinstalling loses local exploration. This update does not publish to Google Play or meet store review requirements automatically.

Complete phone tests, a restore rehearsal and load measurements before expanding beyond a small pilot. Review privacy/support contact, rules and retention; appoint the responsible privacy contact and review [NZ Privacy Commissioner guidance](https://www.privacy.org.nz/responsibilities/collecting/). The included disclosure is a starting point, not legal certification. Public signup has request throttles, message preferences and moderators, but no CAPTCHA or verified identity checks.

OpenStreetMap attribution/cache behaviour is retained. [Public tile usage policy](https://operations.osmfoundation.org/policies/tiles/) applies; choose a provider suitable for growth or host appropriate tiles. Do not assume unlimited free public tiles. No map-download/offline bulk caching is implemented.

## Scale and testing limits

The service remains one Node 24 process with SQLite WAL and a bounded in-memory voice relay. Directory and event feeds currently cap at 500 crews and 1,000 recent events; this pilot is not engineered for unbounded nationwide traffic. Server HTTP connections cap at 200; auth requests share a 30/minute throttle. Benchmark real data, database size, concurrent voice bandwidth and home uplink before raising limits or splitting services.

See `TEST-REPORT.md` for executed checks and untested device/hosting boundaries. `tests/load-pilot.mjs` is a local synthetic read check, not a home-server capacity estimate.

## Source layout

- `server/server.mjs`: authentication, location, garages, convoys; delegates community and moderation.
- `server/community.mjs`: crew migration, memberships, applications, events and invitations.
- `server/safety.mjs`: signup settings, blocking, reports, recovery, staff controls and audit.
- `server/comms.mjs`: crew posts, messages, photos, call signalling and authenticated audio relay.
- `android/app/src/main/assets/`: bundled Leaflet UI, community screens and camera seed.
- `android/app/src/main/java/nz/crewline/app/`: Android permissions, GPS, photos, calling and camera alerts.
- `deploy/`: private Docker/service deployment, update, backup, restore and timer setup.
- `tests/`: API/migration/privacy tests, UI smoke test, Java transport and proximity checks.

For a new installation use `sudo bash deploy/docker-start.sh`, then private Tailscale Serve. The current SQLite schema upgrades from native Crewline 1.0/1.1, not the early Expo 0.1 prototype.

## GPS tools and camera layers (1.6)

Map has separate speed-camera, ANPR and road-CCTV controls. More → Speedometer & timers has private GPS speed, closed-course timing and opt-in crew leaderboards. See [1.6 guide](UPDATE-1.6.md) for accuracy limits and privacy. No public leaderboard.

The bundled surveillance subset is adapted from Jay J’s NZ CCTV Camera Map under CC BY-NC 4.0. It is for noncommercial use; a free app is not automatically noncommercial if used to support a commercial business. Before monetising or using commercially, obtain permission or replace the data. See [source collection](data/NZ-CCTV-SOURCES.md), [licence](data/NZ-CCTV-LICENSE.txt) and [import documentation](data/SURVEILLANCE.md). This licence is specific to that data; it does not grant rights over unrelated Crewline code.

### Full-screen map (1.6.1)
Map and Explore have a Full screen / Exit full screen button. Map options opens the floating controls, including all three camera switches on Map. See UPDATE-1.6.1.md. Android-only update; server remains 1.6.0.

### Convoy map and directions (1.7)
Joining or viewing a convoy opens its full-screen map. Convoy options holds readiness, radio, pings and organiser tools; push-to-talk stays available on the map. Directions to the meeting, destination or stops stay inside Crewline, with a route line, foreground location updates, visual maneuver guidance and manual recalculation. Update both server and APK. See UPDATE-1.7.md for routing-provider disclosure, setup and limitations.

### Continuous navigation GPS (1.7.1)
Navigation follows automatically using a dedicated foreground GPS listener and smooth movement between fixes. Actual cadence depends on the phone. Drag to browse, then Follow me to resume. See UPDATE-1.7.1.md. Server stays at 1.7.0.

### One-tap convoy pings (1.7.2)
Five left-side map buttons send police, speed-camera, checkpoint, roadworks and traffic pings directly at your current location. Feedback includes an optional Undo. The options menu retains manual placement. See UPDATE-1.7.2.md; server remains 1.7.0.
