# Crewline 1.6 update guide

Update the server first, then install the APK over the existing pilot app. Do not uninstall it. The APK is signed with the same pilot certificate as 1.5; it is not a production-signed release. Existing accounts, crews and photos stay in the server database. Your server address and Tailscale setup do not change.

```bash
unzip -o ~/Downloads/crewline-server-and-source-1.6.zip -d ~/Applications
cd ~/Applications/crewline-android
sudo bash deploy/update-docker.sh
curl http://127.0.0.1:8080/health
```

Expected health: `{"ok":true,"version":"1.6.0","protocol":4}`. The updater builds first and makes a database backup before replacing the container. Copy the backup off the server too. If updating fails, read the error and logs; do not run old software against a migrated database without restoring a compatible backup. This chat has not modified your running server.

## Camera layers

On **Map**, use **Hide/Show speed cameras**, and expand **ANPR & road CCTV layers** for the two new switches. Visibility is remembered. ANPR and CCTV start hidden to avoid clutter. Nearby records are grouped; tap and zoom to inspect them. Existing speed-camera alert settings remain independent.

The added collection contains 600 explicit ANPR records and 3,454 selected road/traffic CCTV records, not a verified inventory of every camera. Records may be stale, approximate or duplicated, and a road address does not prove field of view. Each popup shows agency, classification basis, source and available date status. **Camera sources & licence** opens the original collection and licence. Data is CC BY-NC 4.0, credited to Jay J / NZ CCTV Camera Map, for noncommercial use. Check permission before commercial use or monetisation. See data/SURVEILLANCE.md.

## Speedometer and timer

Open **More → Speedometer & timers**, then **Start GPS** while parked outdoors. Grant precise location. This GPS session never enables crew sharing. A previous, separately enabled sharing session remains controlled by your existing drive controls.

Choose a vehicle and category: **0–60, 0–100, 100–200 km/h, ⅛ mile, ¼ mile or ½ mile**. Confirm closed-course use, then arm while stationary. Standing starts require three seconds below 0.5 m/s; timing begins at the sample before movement crosses that threshold. Rolling 100–200 timing waits for an upward crossing of 100 km/h. There is no one-foot rollout. Finish crossings are interpolated. Distances are integrated from GPS speed, not surveyed distance. Results are approximate and are not certified acceleration or drag-racing measurements. Slope and wind are not measured or corrected.

Keep the phone secured and the screen open. Arming and review are for when stopped; do not operate it during a run. The screen stays awake while GPS is active. Timing cancels on app pause, screen lock, poor/stale/mock GPS, implausible speed jumps, or gaps longer than 1.5 seconds. The display blanks instead of retaining stale speed. The phone must supply GPS speed accuracy; unsupported devices can show speed but cannot produce valid timer results. Requirements: position accuracy ≤15 m, speed accuracy ≤1.5 m/s, age ≤1.5 seconds. These limits still allow meaningful measurement error, especially with 1 Hz phone GPS. Use the vehicle speedometer for driving.

## Saved runs and scoreboard

Runs save automatically **on this phone**, separately for each account, up to 200 recent runs. Personal bests are calculated from retained runs; deleting or ageing out a run removes it from personal-best calculations. No coordinates or route are recorded in these results. App uninstall or clearing app data deletes local results. Account deletion clears this phone's local runs and removes shared server results.

After stopping, **Review saved result → Share this result with crew** explicitly uploads the selected time, category, vehicle, GPS-quality summary and your member identity. The crew leaderboard ranks each current member's best shared result per category, up to 100 members. It is not public and all entries are labelled unverified phone GPS. Membership checks, blocking and bans apply. Server validation cannot prove that a client-submitted result is authentic.

Remove entries from the leaderboard, or use **Manage my shared results** to remove your other submissions, including after leaving a crew. Crew owners/admins and site admins/moderators may remove leaderboard entries. Removed run IDs cannot be reposted to the same crew; a minimal server tombstone remains until account/crew deletion. Deleting a local result does not remove shared entries. The server caps each user's stored submissions at 1,000, including tombstones.

## Phone testing before wider distribution

1. Verify all three map switches independently, close/reopen the app and check persistence. Tap grouped cameras and read source details.
2. Try GPS outdoors without enabling sharing; confirm another member does not receive your location.
3. Verify loss of signal and disabling Location blanks speed; deny permission and confirm the recovery prompt.
4. On a closed course, compare speed and repeated timer results with trusted equipment. Do not validate performance timing on public roads.
5. Lock the screen or switch apps during an armed run; it must cancel and stop the tools' GPS session.
6. Share one run with a test crew; check another crew cannot access it. Delete locally and on the leaderboard separately. Test organiser removal and leaving a crew.
7. Check normal calls, convoy reports, camera warnings and existing tracking still work on your phones.

Automated timing, API, upgrade, browser UI and native voice-transport checks are included in source. Android compilation/signature checks passed. Native GPS, screen-lock behaviour, permission prompts, battery use and real timing accuracy still require phone testing. Production signing, public hosting and the wider public-launch checklist remain separate work.
