# 1.4 status

See UPDATE-1.4.md for the current remaining-work list. Organiser removal, plan-text/time editing, convoy change notifications and account-specific auth limits are now implemented. This remains a test-signed pilot, with the real-device and operational checks outstanding.

Earlier checklist below retained for context:

# Crewline public-launch readiness — 2 November 2026

The current download is a test-signed pilot. Adding more screens is not the main remaining task. The next release should be driven by real-device reliability, security review and operational testing.

## Before inviting strangers

1. **Private production signing and updates.** Generate a key you control using `android/build-release.sh`, back it up, choose the distribution channel and test updates. The current public test key is suitable only for the existing pilot. A new signing identity cannot update test-key installations directly. Add an in-app version/update notice and a stable download page so people know where legitimate updates come from.
2. **Real-phone trial.** Test at least two Android phones, including the user's GrapheneOS setup, on different mobile networks. Exercise registration/recovery, camera alerts, convoy readiness/navigation, photos, screen-lock voice, microphone permissions, dropped connections and app restarts. Test radio release/cancel, switching apps during transmit, notification interruptions and loss of network. Bluetooth car/headset microphone routing and hardware push-to-talk buttons are not implemented/tested as an integration.
3. **Security and abuse review.** Have the authentication, native WebView bridge, media relay and every private-content boundary independently reviewed. Global auth throttling can be exhausted by someone else: use appropriate per-source/account limits and consider bot protection for open signup. Review staff authentication (including stronger admin protection), session management, malformed image handling, data quotas and moderation coverage. Automated tests are not an independent security audit.
4. **Moderation workflow.** Recruit named moderators, set contact details and rules, rehearse reports/bans/appeals and content deletion. Reporting and blocking exist, but blocking currently focuses on direct contact and location markers; shared public discussions are not hidden. Add report/block entry points consistently in public participant/content views. Convoy reports are supported in 1.3. Public convoy organisers still need their own participant-removal/approval controls before large open drives.
5. **Hosting and recovery.** Keep the host awake; install the supplied daily backup/health timers; copy encrypted backups off the laptop; rehearse restoring into a disposable instance. Add external downtime notifications: existing checks only log locally. Measure real home upload capacity with simultaneous photo and voice activity. Funnel can provide public access without a purchased domain or port forwarding, but its bandwidth limits are not a nationwide-capacity guarantee. Keep the app/API private while checking these items.
6. **Maps and camera data.** Use a tile provider/hosting plan appropriate for the audience. Public OSM tile servers are not an unlimited hosting entitlement. Camera data is a manually reviewed snapshot; establish an update owner/process and visible freshness checks. Place search/geocoding, driving-route previews, corridor average-speed calculations and offline map downloads are not implemented. Pin selection and installed navigation apps work without a new routing service.
7. **Privacy and support.** Publish a reviewed privacy statement matching actual hosting, data access, retention and backup practices; provide a reachable contact and usable deletion/access/correction process. Explain that messages and server-relayed voice are not end-to-end encrypted. A stored privacy-contact field is not a complete privacy programme.
8. **Scale the feeds and storage.** Current limits include 500 directory crews, 1,000 recent events, 200 recent convoys, 100 participants per convoy and 8 voice participants. Add pagination/search that works beyond these limits; measure SQLite, polling and audio load before expanding. Muted radio clients still send silence frames and receive other participants, so leaving the channel is necessary to stop its data usage.

## Convoy improvements after the pilot

- Editing/rescheduling a plan without deleting it, with change notifications to participants.
- Convoy-specific live location sharing and privacy controls. Existing location sharing remains scoped to the selected crew; joining a public convoy does not expose your location.
- Organiser participant approval/removal and radio speaker management.
- Dedicated convoy text chat, notification reminders, route/stop navigation handoff and place search.
- Validate the unreleased single-speaker convoy radio floor and removed eight-person voice cap under real-world load. Automated 20-client forwarding tests do not establish reliable 20-phone capacity on mobile networks.

## If distributing through Google Play

Check current requirements in Play Console: signing/bundles, target API, foreground-service declarations, permissions, Data safety, privacy disclosures, account deletion and user-generated content policies. The existing APK-only build script does not produce a store-ready Android App Bundle.

Google's user-generated content policy requires relevant terms acceptance and reporting/blocking controls. New personal developer accounts covered by Google's testing rule need at least 12 continuously opted-in closed-test users for 14 days before applying for production access. Passing that threshold is not automatic approval.

Sources checked during this work:
- https://support.google.com/googleplay/android-developer/answer/9876937
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://developer.android.com/developer-verification
- https://tailscale.com/docs/features/tailscale-funnel
- https://operations.osmfoundation.org/policies/tiles/
- https://www.privacy.org.nz/responsibilities/collecting/

Suggested rollout: private two-phone checks → a small local crew pilot → limited public beta after the above blockers → wider NZ promotion based on measured reliability and moderation capacity. No paid hosting, domain, store account or public deployment was purchased or activated by this update.
