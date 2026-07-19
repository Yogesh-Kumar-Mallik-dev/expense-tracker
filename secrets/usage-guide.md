# Environment usage guide

Repository development commands automatically load the matching
`env.development.*` files.

To customize one runtime without changing tracked defaults:

```bash
cp secrets/env.development.api secrets/env.development.api.local
```

Pass the local file explicitly with Node when running a package command:

```bash
cd apps/api
node ../../secrets/run-with-env.mjs \
  ../../secrets/env.development.database \
  ../../secrets/env.development.api.local \
  -- node node_modules/next/dist/bin/next dev --port 3001
```

Production deployments should map every non-comment entry in the corresponding
`env.production.*` files to the platform secret manager or environment
configuration. Do not source the placeholder production files directly.
