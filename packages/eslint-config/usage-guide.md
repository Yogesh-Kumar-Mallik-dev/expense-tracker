# ESLint Configuration Usage Guide

Install the workspace package as a development dependency, import the relevant
configuration from `@expense-tracker/eslint-config`, and keep narrowly scoped
overrides in the consumer's ESLint configuration.

Run all workspace lint tasks:

```sh
pnpm lint
```

Run one package or application:

```sh
pnpm --filter <workspace-package-name> lint
```

See [README.md](./README.md) for the exports currently provided by this
package.
