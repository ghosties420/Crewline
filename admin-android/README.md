# Crewline Admin — private Android client (work in progress)

Separate app/package (`nz.crewline.admin`) for the Crewline operator. It does not need Google Play or Google services.

## Working source features

- Sign in with an existing Crewline moderator/admin account. Only HTTPS server addresses are accepted.
- Encrypted saved session token using Android Keystore; app data backup and screenshots are disabled.
- View the existing community dashboard (accounts, reports, roles, audit records).
- Suspend/unsuspend users, change roles (site admins), resolve/dismiss reports, review reported evidence with logging, remove reported content, manage privacy contact and signup settings.
- Live app process metrics: memory, uptime, active calls, radio sockets, active convoy count, recent shared locations.
- Embedded SSH2 shell using the maintained JSch library. It supports typing commands, basic text output, Ctrl+C, Tab and arrow keys. No external terminal application is needed.
- Each Android/GrapheneOS profile creates its own SSH key pair. The private key is protected at rest with that profile's Android Keystore; the public key can be copied to the server account's `~/.ssh/authorized_keys`.

## Important not-yet-built capabilities

This is **not yet a complete operational release**. The new embedded SSH shell has not yet been verified on a physical Android phone. The basic text renderer cannot accurately display full-screen cursor-heavy terminal programs (like Vim, top and htop). Android notifications for server incidents, independent uptime checks, VPS CPU/disk/network charts, native biometrics, direct one-touch service management, and deployment/backup management screens are not implemented. Do not treat the app as a substitute for server-side monitoring and external alerts.

The public Crewline backend is **not** a general command-execution API. The SSH shell connects directly from the phone to the Linux server, not through the Crewline API. Restrict SSH to Tailscale/approved infrastructure; use key authentication and a non-root Linux account. The initial server host-key fingerprint must be checked against the server before accepting it; changed/revoked host keys are rejected.

### GrapheneOS secondary profile

GrapheneOS isolates application data, credentials and VPN configurations by profile. Install Crewline Admin in the secondary profile, unlock it there, and separately install/connect Tailscale **in that same profile** if the server uses a private tailnet hostname. Open the SSH tab, copy that profile's public key and add it to the server's `authorized_keys` using an already-trusted connection. Keys from the Owner profile are deliberately not shared. This lets the SSH shell work entirely within the secondary profile without Termux or another SSH client.

## Build

Requirements: JDK 17, Android SDK platform 35 and build-tools 35.0.0, a network connection to Maven Central to obtain the pinned JSch 2.28.8 SSH library, plus a separate private signing key for real distribution.

```bash
export ANDROID_SDK_ROOT=/path/to/android-sdk
bash admin-android/build-apk.sh
```

The default script signs a local development APK using a test keystore and creates `admin-android/build/crewline-admin.apk`. It does **not** use the Crewline public-app signing key. Back up your production app signing key; do not commit it or the source repo's test key.

## Backend prerequisites

Deploy the server in this same version/commit for the `/admin/metrics` endpoint. Moderation endpoints were already present in Crewline 1.5. Log in with a Crewline account promoted to site administrator using the documented server admin command. The mobile app must be able to reach the server over HTTPS (e.g. via a private Tailscale connection during beta).

Server statistics here reflect the Crewline Node process, not the whole VPS. Real-world radio load remains unbenchmarked; removal of an artificial eight-person membership cap does not mean unlimited physical capacity. The test suite verifies forwarding to 20 connected clients locally.
