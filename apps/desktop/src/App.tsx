import { PlatformBadge } from "@expense-tracker/ui-web";

export function App() {
  return (
    <main>
      <section>
        <PlatformBadge className="eyebrow">
          Expense Tracker Desktop
        </PlatformBadge>
        <h1>Local-first finance, in a native window.</h1>
        <p>
          Tauri and React are initialized. The native PowerSync database can now
          be connected through the desktop bootstrap boundary.
        </p>
      </section>
    </main>
  );
}
