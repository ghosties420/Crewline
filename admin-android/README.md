# Crewline Admin — private Android client (work in progress)

Separate app/package (`nz.crewline.admin`) for the Crewline operator. It does not need Google Play or Google services.

## Working source features

- Sign in with an existing Crewline moderator/admin account. Only HTTPS server addresses are accepted.
- Encrypted saved session token using Android Keystore; app data backup and screenshots are disabled.
- View the existing community dashboard (accounts, reports, roles, audit records).
- Suspend/unsuspend users, change roles (site admins), resolve/dismiss reports, review reported evidence with logging, remove reported content, manage privacy contact and signup settings.
- Live app process metrics: memory, uptime, active calls, radio sockets, active convoy count, recent shared locations.
- SSH entry opens an installed Android SSH client via `ssh://` URI, for use with private Tailscale connectivity. No server password or SSH key is placed in Crewline Admin.

## Important not-yet-built capabilities

This is **not yet a complete operational release**. It has not been compiled or verified on a physical Android phone in the current development environment. The terminal is an external SSH-client handoff, **not an embedded terminal emulator**. Android notifications for server incidents, independent uptime checks, VPS CPU/disk/network charts, native biometrics, direct one-touch service management, and deployment/backup management screens are not implemented. Do not treat the app as a substitute for server-side monitoring and external alerts.

The public Crewline backend is **not** a general command-execution API. Never expose an unrestricted shell endpoint or SSH key to its public application service. Restrict SSH to Tailscale/approved infrastructure; use key authentication and a non-root Linux account.

## Build

Requirements: JDK 17, Android SDK platform 35 and build-tools 35.0.0, plus a separate private signing key for real distribution.

```bash
export ANDROID_SDK_ROOT=/path/to/android-sdk
bash admin-android/build-apk.sh
```

The default script signs a local development APK using a test keystore and creates `admin-android/build/crewline-admin.apk`. It does **not** use the Crewline public-app signing key. Back up your production app signing key; do not commit it or the source repo's test key.

## Backend prerequisites

Deploy the server in this same version/commit for the `/admin/metrics` endpoint. Moderation endpoints were already present in Crewline 1.5. Log in with a Crewline account promoted to site administrator using the documented server admin command. The mobile app must be able to reach the server over HTTPS (e.g. via a private Tailscale connection during beta).

Server statistics here reflect the Crewline Node process, not the whole VPS. Real-world radio load remains unbenchmarked; removal of an artificial eight-person membership cap does not mean unlimited physical capacity. The test suite verifies forwarding to 20 connected clients locally.
