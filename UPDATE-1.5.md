# Crewline 1.5 — Convoy road reports

## Use it

Join a convoy, open its details, then choose **View convoy map & road reports**. Choose Police, Speed camera, Checkpoint, Roadworks or Traffic. The app requests a fresh location. Check the pin, tap/drag to correct the sighting position, then send. If GPS fails you can select a map point manually. Report only while stopped or as a passenger.

Only current joined members who can access the convoy can read or send these reports. A public convoy's reports are not exposed to people who have not joined. Sending a ping explicitly uploads that selected location, even with live sharing off; it never starts continuous tracking. Reports don't include the reporter's name in the member API, although the server retains authorship for moderation.

| Type | Lifetime |
|---|---|
| Police | 15 minutes |
| Checkpoint | 15 minutes |
| Traffic | 30 minutes |
| Speed camera sighting | 60 minutes |
| Roadworks | 120 minutes |

Reports are unverified sightings, separate from the published fixed-camera database. They appear on the convoy map, not on the main map or in the fixed-camera alert system. Refresh is every five seconds while the map is open and the app is visible. There are no background proximity sounds or push alerts for these reports. Internet/server access is required; reports are not queued offline.

Tap a marker to see its report/expiry times. Authors and the organiser can remove it immediately. Two different other members can mark it **No longer there** to remove it; one member cannot vote twice. Five submissions per account per minute and 200 active reports per convoy limit spam; repeated same-type taps by the same author at approximately the same point within a minute reuse the report. Abuse can be reported through the convoy's Report button. No new platform-wide report moderation dashboard was added.

Expired reports are filtered and purged on report requests and by the server cleanup timer. Completed convoys no longer expose reports. Previous database backups may still contain reports according to the host's backup retention. Joining another convoy, leaving, removal, or losing private-crew membership does not grant access to these reports.

## Update your existing Docker installation

Download the source ZIP to Downloads, then run:

```bash
unzip -o ~/Downloads/crewline-server-and-source-1.5.zip -d ~/Applications
cd ~/Applications/crewline-android
sudo bash deploy/update-docker.sh
curl http://127.0.0.1:8080/health
```

Expected version: `1.5.0`, protocol `4`. The updater backs up the database and retains the existing Docker volume, environment file and Tailscale configuration. Install the 1.5 APK over the previous pilot app without uninstalling. This downloadable APK is signed with the same pilot key as 1.4. No signing keys are included in GitHub or the source ZIP; a locally generated fresh test key cannot update the existing pilot installation.

No automatic GitHub updater or production signing transition was added. No public endpoint was activated.

## Validation

Nine API test files passed, including road-report membership and private-crew isolation, expiry, invalid input, duplicate submissions, rate limits, distinct clearing votes, author/organiser removal, cross-convoy deletion protection, revoked access and finished-convoy rejection. Browser smoke tests exercised creating a police report, displaying/removing its marker and sending a traffic report, alongside existing workflows. GPS and native services were mocked and map tile downloads were blocked. Android APK compiled and signature verification passed. Physical phone use, actual GPS and mobile networking need a two-phone trial.

## Making joining easier — recommended next implementation

Use a **Share convoy** link and QR code plus a short code as fallback. Opening the link should show the convoy preview, require sign-in if needed, then offer one Join button. Joining should never automatically enable GPS or microphone access. Private crew invitations must retain membership checks; any future guest invitations should have explicit organiser-controlled expiry and revocation.

For a wider community launch, configure a public HTTPS app endpoint so ordinary users don't need Tailscale or to type a server address. Use verified Android App Links tied to the website and the production signing certificate. For users without the app, show an installation page and let them reopen the invite link after installation; ordinary App Links alone do not provide automatic post-install invite recovery. Invite links, QR codes and short codes are recommendations, not implemented by this release.
