# Web Application Usage Guide

Start the complete web development stack from the repository root:

```bash
pnpm dev:web
```

This starts the API on port 3001 and the Next.js frontend on port 3000. The web
host proxies `/backend/*` to the API, so registration and login require both
processes.

If the API is already running separately, start only the UI:

```bash
pnpm dev:web:ui
```

Account creation is available from the sign-in screen and directly at
`http://localhost:3000/signup`.

Authenticated users can export bounded, structured client diagnostics from
Settings. API logs are printed as boxes and written as rotating JSONL files
under `logs/`. Neither output includes credentials, request bodies, raw SQL, or
database arguments.

Refer to `packages/db-offline/usage-guide.md` for the web driver and
`apps/api/usage-guide.md` for backend requests.
