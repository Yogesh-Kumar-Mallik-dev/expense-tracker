import { PlatformBadge } from "@expense-tracker/ui-web";

const platforms = ["Web", "Desktop", "Mobile"];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Expense Tracker</p>
        <h1>Your money, available even when the network is not.</h1>
        <p className="lede">
          The web client is ready for the shared offline database, services, and
          PowerSync bootstrap.
        </p>
        <div className="platforms" aria-label="Supported platforms">
          {platforms.map((platform) => (
            <PlatformBadge key={platform}>{platform}</PlatformBadge>
          ))}
        </div>
      </section>
    </main>
  );
}
