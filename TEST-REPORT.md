# 1.6 validation — 3 November 2026

- 16 Node tests pass across API, upgrade and pure timing suites. New coverage: consent, crew isolation, per-category rankings, moderation/removal, tombstones, banned/departed members, private submission management, interpolated acceleration and distance finishes, rolling starts, bad/mock/stale GPS and cancellation.
- Full existing browser smoke suite and new driving-tools workflow pass against a real local API. Native GPS/storage bridge mocked; no physical GPS. Tests cover independent camera toggles, account-private run storage, explicit sharing, leaderboard/local deletion, stale speed display, lifecycle cleanup and 320-pixel layout. Screenshots visually inspected.
- Native Java TLS/WebSocket voice transport regression passes.
- APK 160 / 1.6.0 compiles; v2/v3 signatures verify. SHA-256 certificate matches 1.5: c311226ee43339677014e165cfefd4b56c9f203b2ae21e2e5580382c1e3725c6. Same pilot test certificate; not a production release key.
- Source locally matched all GitHub main blobs at bf491ae6239723b37fd52bc4b933d24c4af4a932 before edits. Source packaging excludes keys, configuration, user data, dependencies and builds.
- No device installation, real timing accuracy, Android permission/lifecycle, battery, GPS, Bluetooth or user-server deployment has been verified here.

# 1.5 validation

Nine API test files passed; browser flows include police/traffic reporting, map markers and removal. APK compiled and signature verified. See UPDATE-1.5.md for scope and device-test limitations.

# 1.4 validation

Eight API test files passed (including the new account-throttle test). Browser workflows passed with mocked native hardware. APK 140 / 1.4.0 compiled and v2/v3 signatures verified; certificate matches 1.3. Java TLS/WebSocket transport test passed. Local synthetic run: 50 clients, 500 empty-account read requests, zero errors; this is not a hosting-capacity benchmark. No physical Android, Bluetooth, real GPS or user-server deployment test was performed. See UPDATE-1.4.md.

Previous reports below are historical.

# Crewline 1.3 validation — 2 November 2026

- Seven server/API test files pass, including the new convoy suite: public/crew visibility, unauthorised joins, pin/stop validation, readiness ownership, no automatic location sharing, private-event prefill restrictions, and radio membership revocation.
- Browser checks exercise map pin planning, public convoy creation, ready status and hold/release radio UI with a simulated native bridge. They retain prior map-camera, profile, messaging, event and moderation checks.
- Fixed a Leaflet modal zoom-transition teardown race by disabling zoom animations in short-lived convoy maps.
- APK compile/signature checks and production Java TLS/audio packet transport checks are run for this release.
- No physical-phone GPS, microphone, background listening, Bluetooth or real home-server deployment test has been performed. A mocked radio control test does not validate transmitted microphone audio. Native timeout/focus controls are code-reviewed and compiled, with real-device checks still required.

Earlier-version evidence follows:

# Android 1.2.1 map update

Browser regression includes all 133 markers, national overview, camera popup source date, and hide/show behaviour. JavaScript syntax, Android compile and APK signature checks run. No server logic changed. Real-device installation and driving checks remain outstanding.

# Crewline 1.2 validation — 1 November 2026

Executed in the build environment:

- Six Node test files: existing account/garage/convoy/privacy workflows; admin backup; board, direct-message isolation, photos and real authenticated WebSocket audio frames; new crew/event/moderation/recovery boundaries; actual on-disk 1.0 and 1.1 schema migrations.
- Community tests verify an unaffiliated account sees public events only, cannot read another crew's posts/messages/locations/calls/private events, cannot approve applications or accept another crew's invitation, and loses private-event access on invite revocation or membership removal.
- Moderation checks cover blocking, staff-only access, reports, content removal, suspended sessions/login and recovery-code single use.
- Browser smoke test against real local API: signup, garage, convoy, map/exploration rendering, posts/replies, messages, call controls, photos, public event creation, RSVP, event discussion and admin UI. Android bridge operations are simulated; no physical GPS/microphone test. External OSM tiles are blocked in this test.
- Production Java TLS/WebSocket class sends/receives real packets through a temporary trusted TLS test server; G.711 codec checks also pass.
- Pure Java camera checks: Haversine distance, 500 m approach, one-alert suppression, rearming after 1 km, moving away, bad/NaN accuracy and stationary suppression.
- Local synthetic load: 50 concurrent clients / 500 alternating state and event reads, zero HTTP errors; approximately 443 ms elapsed, 12 ms median and 230 ms p95 in this run. Empty account data, in-memory database, no TLS/voice/maps/photos/home internet. These numbers do not establish deployment capacity.
- Android APK compiled with JDK 17/SDK 35; signature verification v2/v3 and version-code check. Shell and JavaScript syntax checked.

Not executed here:

- Actual Android/GrapheneOS install, driving GPS/audio warnings, microphone/speaker/echo/Bluetooth, lock-screen calls, notification sound/DND or battery behaviour.
- User's Docker/systemd upgrade, timer installation, Tailscale Funnel or real home-uplink load.
- Full operator restore rehearsal, remote backup delivery, store publication, production signing on the host or an independent security audit.

The camera seed was assembled from NZTA's indexed published table (source update 1 October 2026). Direct automated retrieval was blocked by the source website; retrieval can be incomplete. All 133 records have distinct IDs and validated NZ coordinates. It is not a complete inventory of all enforcement cameras, and includes no mobile locations, enforcement headings or speed-limit data.
