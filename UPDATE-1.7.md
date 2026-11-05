# Crewline 1.7 — convoy map and in-app directions

Update the server first, then install the APK over the existing app. Do not uninstall. This build uses the same pilot signing certificate. Your server address, accounts and Tailscale setup stay the same. This download does not update your running server automatically.

On the server, with the ZIP in Downloads and the existing installation under Applications:

```bash
unzip -o ~/Downloads/crewline-server-and-source-1.7.0.zip -d ~/Applications
cd ~/Applications/crewline-android
sudo bash deploy/update-docker.sh
curl http://127.0.0.1:8080/health
```

Expected health: `{"ok":true,"version":"1.7.0","protocol":4}`. The updater builds first, backs up the existing database, then replaces the container using the existing environment and data volume. Keep an off-server backup too. If your installation is elsewhere, extract over that existing project folder instead; the updater requires its existing `deploy/docker.env`.

## Using the convoy map

- Create, join or view a convoy to open its full-screen map.
- **Convoy options** opens the dropdown: join/leave, ready status, radio, directions, pings and organiser controls. Tap the map to close it.
- **Convoy radio** keeps the map open. Hold-to-talk and Leave radio appear underneath it.
- Navigate to the meeting point, destination or a chosen stop. **Drive via all stops** routes from your current position through the planned stops in order to the destination; it does not first route through the meeting point.
- Directions stay inside Crewline. An orange road route and a scrollable directions panel show the next estimated maneuver and full instruction list. **Follow me** follows foreground GPS updates. Dragging the map turns follow off.
- **Recalculate route** requests a fresh route from your current location. Recalculating “all stops” includes every stop again; select an individual remaining stop or destination after passing stops.
- Pings remain visible and usable while directions are open. **Stop directions** removes the route. Closing or changing the convoy screen stops its guidance; reopen directions after editing readiness or the plan.

## Routing and privacy

The default small-pilot routing provider is FOSSGIS at `https://routing.openstreetmap.de/routed-car`, using OSRM and OpenStreetMap roads. Before requesting a route, the app asks you to confirm sending your position and selected convoy pins through your server to that provider. The provider can log routing requests. Crewline does not save these coordinates or enable crew sharing as part of directions. Existing separately enabled location-sharing settings are unchanged.

The server limits routing to one request per 1.1 seconds across users, plus six requests per user per minute. Busy requests ask you to retry. This public service is for light use, has no availability guarantee and is not suitable for a large rollout. Policy: https://routing.openstreetmap.de/about.html . Attribution and “Fix the map” are displayed on the map.

For your own OSRM server, set `ROUTING_URL=https://your-router.example` in `deploy/docker.env` before running the updater. It must be the base URL before `/route/v1/driving/`, serving OSRM JSON with `steps=true&overview=full&geometries=geojson`. Use an internal HTTP address only on a trusted private network; `localhost` inside Docker refers to the Crewline container. Configuring a custom URL does not install or populate a routing engine. Users see the provider hostname after a successful route. No API key is required for the default pilot provider.

## Current limits and verification

This is basic foreground visual guidance, not a production navigation system. There are no spoken instructions, live traffic, lane guidance, offline routes or automatic rerouting. Keep Crewline open with Location enabled. Route times are estimates. Position is refreshed about every four seconds after a fix, with longer waits on poor GPS. Nearest-road maneuver estimates can be wrong at overlapping roads or loops. Screen lock/background pauses updates; the next foreground fix resumes them. Use road signs and conditions over app instructions.

Automated checks cover routing access, consent, waypoint selection, provider failures and request throttling; UI checks cover directions, radio, pings and dropdown layouts on small portrait and landscape screens. Browser GPS and routing responses are mocked. The APK compiles and its signature is verified. Real phone GPS, road guidance, background/resume, mobile connectivity and public-provider availability still need a passenger or stationary-device test before relying on this pilot.

Source is prepared on the existing feature branch and draft pull request, not merged or deployed.
