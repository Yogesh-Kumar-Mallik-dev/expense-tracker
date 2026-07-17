# Test Architecture

The central suite imports application and package source directly so grouped
tests do not require publishing or prebuilding the target package. Production
build verification remains a separate workspace command.

Groups:

- `api/` for backend behavior;
- `services/` for domain and adapter contracts;
- `logger/` for logging behavior;
- `web/` for Next.js-facing behavior;
- `ui-web/` for shared DOM components;
- `ui-native/` for shared React Native tokens and primitives.
