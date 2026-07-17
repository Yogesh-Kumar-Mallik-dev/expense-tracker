# ESLint Configuration Architecture

The shared ESLint package centralizes repository lint policy so applications
and packages do not copy configuration. Consumers should extend the matching
export and keep application-specific overrides local.

Lint configuration must remain development-only and must not be imported by
runtime source code.

See [README.md](./README.md) for available exports and
[usage-guide.md](./usage-guide.md) for commands.
