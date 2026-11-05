# Crewline 1.7.2 — one-tap convoy pings

Install crewline-android-1.7.2.apk over your existing app. Do not uninstall. It uses the same pilot signing certificate. No update is needed to your working 1.7.0 server. Keep the existing NODE_OPTIONS networking fix in deploy/docker.env.

## Map buttons

Joined, active convoys now have five large buttons on the left of the map: Police, Speed camera, Checkpoint, Roadworks and Traffic. Tap a type once to send it at your current position. No dropdown, location picker or confirmation is required. The buttons use two columns on short screens so every type stays accessible.

A message shows Getting location, Sending, then Ping sent. An optional Undo ping button removes the newly created report. This is not an extra confirmation step. An already-existing duplicate report is identified without offering Undo for that older report. The map stays on your route rather than jumping to the ping.

A recent navigation GPS fix is used immediately when available (up to three seconds old, reported accuracy no worse than 50 metres). Otherwise the app requests a fresh fix and sends automatically when it arrives. The first location request can still require Android's permission prompt. Without a usable fix, the app shows an error and does not invent a location or queue an offline report for later. A network error may leave delivery uncertain; the message says not confirmed, and the next refresh can show a report that reached the server.

Buttons are disabled while a report is pending and briefly afterwards to prevent accidental repeated taps. Existing server report limits and duplicate checks still apply. Each ping shares its point with joined convoy members even if continuous location sharing is off. Continuous sharing remains under its existing controls.

Convoy options still contains Choose location buttons for manually placing a report somewhere else, plus existing report refresh, expiry, removal and moderation controls. Completed convoys and people who have not joined do not get the one-tap buttons. Closing the map before location lookup finishes cancels that pending send; a request already sent to the server may still complete.

## Verification

The APK builds and signature verifies. Browser checks cover all five direct-send buttons, no extra dialog, failed GPS without a report, successful marker creation, Undo, completed-convoy hiding, and 320-pixel portrait / 844-pixel landscape layouts alongside navigation. Existing radio, navigation-following and other smoke-test flows pass. Native GPS and network calls are simulated in the browser tests; verify on the phone with a passenger or while stopped. A single tap still takes attention from driving.
