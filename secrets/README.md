# Environment configuration

All application environment-variable inventories live in this directory.
Files are split by environment and runtime:

```text
env.<environment>.<runtime>
```

The supported runtimes are `database`, `api`, `web`, `desktop`, and `mobile`.

- `env.example.*` documents every supported variable with inert examples.
- `env.development.*` contains safe repository-local defaults.
- `env.production.*` is a deployment manifest containing placeholders only.

Never put real production credentials in this repository. Inject them from the
deployment platform or secret manager. For developer-specific overrides, copy
the relevant file to `env.development.<runtime>.local`; `*.local` files are
ignored by Git.

See [docs.md](./docs.md) for ownership and security boundaries and
[usage-guide.md](./usage-guide.md) for commands.
