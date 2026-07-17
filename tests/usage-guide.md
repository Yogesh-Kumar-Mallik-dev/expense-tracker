# Test Usage Guide

Place every new test in the matching directory under this workspace and name it
`*.test.ts` or `*.test.tsx`. Update the group glob in `tests/package.json` when
introducing a new file extension or test category.

Run the smallest relevant group while developing and `pnpm test` before
handoff.
