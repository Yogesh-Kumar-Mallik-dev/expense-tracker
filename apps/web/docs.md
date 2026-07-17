# Web Application Architecture

Status: planned.

The web client will:

- use Next.js for the user interface;
- initialize only `@expense-tracker/db-offline/driver/web`;
- construct shared services with offline service adapters;
- use WASQLite for local persistence;
- connect PowerSync to the backend credentials and upload endpoints;
- store authentication tokens outside synchronized application tables.

Platform driver imports must remain in web bootstrap code so native mobile and
Tauri modules cannot enter the web bundle. UI components must not contain
business rules already owned by `@expense-tracker/services`.
