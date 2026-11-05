# Crewline 1.6.1 — full-screen map

Install crewline-android-1.6.1.apk over your existing app. Do not uninstall. It uses the same pilot signing certificate as 1.6.

If your server already runs 1.6.0, no server update is needed. This is an Android interface update. The included source ZIP also contains the unchanged 1.6 server for anyone upgrading from an older release. Older servers should be upgraded using the steps in UPDATE-1.6.md (use the new ZIP filename); the server health version remains 1.6.0, protocol 4.

## Controls

- Open **Map → Full screen** to hide Crewline's header and bottom navigation. The map fills the available app area. Android system bars and any active call/status banners remain available.
- Tap **Exit full screen** to restore navigation.
- Tap **Map options** to open a dropdown containing location-sharing controls and the separate speed-camera, ANPR and road-CCTV switches. Tap the heading again, or tap the map, to close it.
- **Centre on me** remains on the map, outside the dropdown.
- Full screen also works in **More → Explore**, with exploration controls in its dropdown.
- Camera visibility stays saved. Zoom and map position survive full-screen resizing. Opening Map again starts in the normal layout, with options closed.
- On a keyboard, Escape closes the dropdown first, then exits full screen.

Full screen and opening the menu do not enable location sharing or start tracking. Existing tracking and camera-alert choices retain their previous behaviour.

## Validation

The Android APK builds and its signature verifies. Browser checks cover entering/exiting full screen, map centre and zoom preservation, dropdown controls, 320-pixel portrait and landscape layouts, existing camera layers, exploration and the prior app workflows. Map tile downloads and native phone hardware are mocked in those browser tests. Confirm rotation and touch controls on your phone after installation.

The source is on the existing 1.6 feature branch / pull request. This does not deploy to your running server or merge the pull request.
