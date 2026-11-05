# Crewline 1.7.1 — continuous navigation GPS

Install crewline-android-1.7.1.apk over your existing app; do not uninstall. It uses the same pilot signing certificate. Your working 1.7.0 server does not need an update. Keep the NODE_OPTIONS IPv4 settings you added to deploy/docker.env. The source ZIP excludes your local environment file and signing key.

Navigation now subscribes to continuous Android GPS updates instead of requesting a new position every four seconds. It requests fixes at 250 ms intervals, but your phone decides the actual frequency; many phones deliver approximately one fix per second. The marker and map interpolate for 300 ms between received fixes, without predicting travel beyond the last known position. This is live following, not a guarantee of four accurate GPS fixes per second.

Following is on automatically when a route opens. Dragging the map pauses following; tap Follow me to centre immediately and resume following. The map remains north-up; heading rotation and a tilted map are not included.

The navigation screen stays awake while its GPS listener is running. Closing directions or the convoy map stops that listener. Switching apps or locking the screen pauses it; returning resumes the listener for an open route. Navigation does not upload these continuous fixes or enable crew location sharing. Separate sharing settings stay under their existing controls.

Old, repeated, or inaccurate fixes are ignored (over 3 seconds old or over 50 m reported accuracy). After 5 seconds without a usable fresh fix, guidance displays Waiting for fresh GPS and stops its animation. Movement resumes when a usable fix arrives. Poor GPS can still cause position error.

The server, routing-provider consent, manual route recalculation, radio, pings and other convoy tools retain their existing behaviour. Spoken instructions, automatic rerouting, offline maps and background navigation remain outside this update.

Validation: Android compilation and signature verification; 18 Node tests; browser checks for successive GPS fixes, automatic following, drag/resume, stale/duplicate/old-session rejection, loss-of-fix warning, convoy radio/pings and the speedometer/timer workflows. Browser native GPS is simulated. Test physical GPS cadence, permission changes, screen lock/resume and battery behaviour on your phone with a passenger before relying on the pilot.
