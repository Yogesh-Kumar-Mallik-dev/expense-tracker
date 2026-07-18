# Release and operations

## Mobile releases

Mobile builds use EAS development, preview, and production profiles. Production
version codes are remotely managed and auto-incremented. Store signing
credentials must remain in EAS credential storage, never in this repository.

Required release gate:

1. Run type checks, lint, tests, Expo Doctor, and the production export.
2. Build both platforms with `eas build --profile production`.
3. Install the signed artifacts on physical devices.
4. Verify SecureStore session restoration, encrypted platform storage,
   offline restart, PowerSync reconnect, and account deletion.
5. Submit the exact tested build with `eas submit --profile production`.

OTA updates are not enabled until an EAS project ID and update URL are assigned.
Native database, SecureStore, PowerSync, or runtime-version changes always
require a store build.

## Desktop releases

Tauri application bundling is enabled. Updater artifacts remain disabled until
the updater plugin, public key, and HTTPS endpoint are configured together.
When updates are enabled, CI must provide `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`; unsigned or placeholder keys are
forbidden.

Release artifacts must be signed on every supported operating system and
installed in a clean virtual machine before publication.

The checked-in Linux bundle targets are `deb` and `rpm`, which build reliably
on the current development host. Produce AppImage artifacts in a pinned
Ubuntu-based release runner; the older `linuxdeploy` toolchain cannot strip
modern RELR-enabled Arch Linux system libraries.

## Backup and restore drill

Run quarterly and before destructive migrations:

1. Create a versioned backup from a seeded test account.
2. Hash and archive the export.
3. Restore it into an isolated dataset on web and desktop.
4. Keep synchronization disabled and compare record counts and money strings.
5. Confirm the active synchronized dataset is unchanged.
6. Remove the isolated local database.
7. Record app version, schema version, duration, and any failed collection.

## Retention and deletion

Account deletion creates a 30-day request and revokes refresh sessions.
Authenticated users can cancel during the grace period. A scheduler calls
`POST /api/internal/retention` with `RETENTION_JOB_SECRET`; the job redacts
financial text, attachment references, credentials, and profile identity.

Object-storage lifecycle rules must separately delete tombstoned attachment
objects. Operators must monitor deletion-job failures without logging financial
content or credentials.

## Telemetry

Set web and desktop clients to the same-origin `/api/telemetry` proxy and
configure the API with `TELEMETRY_INGEST_URL` plus an optional
`TELEMETRY_INGEST_TOKEN`. Client logs are sanitized by the shared logger,
batched, bounded, and retried without blocking product workflows. Never put a
vendor ingestion secret in a browser, desktop, or mobile bundle.
