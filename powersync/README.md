# PowerSync Deployment

This directory contains the production synchronization contract:

- `sync-config.yaml` defines edition 3 user-scoped Sync Streams.
- `service.example.yaml` is a self-hosted service template.

Every stream filters by the authenticated JWT subject through
`auth.user_id()`. The profile stream explicitly omits `passwordHash`, and
`RefreshToken` is never synchronized.

## Authentication

The API signs five-minute RS256 PowerSync tokens and publishes the public key:

```text
GET /api/auth/keys
GET /api/powersync/credentials
```

Configure PowerSync Cloud Client Auth with:

- JWKS URI: `https://<api-host>/api/auth/keys`
- Audience: the exact `POWERSYNC_AUDIENCE` value

For self-hosting, set:

```env
PS_DATABASE_URI=postgresql://...
PS_STORAGE_URI=postgresql://...
PS_JWKS_URI=https://api.example.com/api/auth/keys
PS_AUDIENCE=https://powersync.example.com
```

The bucket-storage database should use a dedicated user/schema. Validate before
deployment:

```sh
powersync validate
```

For a CLI-managed local instance, apply changes with:

```sh
powersync docker reset
```
