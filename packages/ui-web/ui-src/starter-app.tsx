import { PlatformBadge } from "./platform-badge";

export type WebPlatform = "web" | "desktop";

export interface StarterAppProps {
  platform: WebPlatform;
}

const copy: Record<
  WebPlatform,
  { eyebrow: string; title: string; description: string }
> = {
  web: {
    eyebrow: "Expense Tracker Web",
    title: "Your money, available even when the network is not.",
    description:
      "The Next.js client is ready for the shared offline database, services, and PowerSync bootstrap.",
  },
  desktop: {
    eyebrow: "Expense Tracker Desktop",
    title: "Local-first finance, in a native window.",
    description:
      "Tauri and React are ready for the native PowerSync database and desktop bootstrap.",
  },
};

const supportedPlatforms = ["Web", "Desktop", "Mobile"];

export function StarterApp({ platform }: StarterAppProps) {
  const content = copy[platform];

  return (
    <main className="ui-web-shell">
      <section className="ui-web-hero">
        <p className="ui-web-eyebrow">{content.eyebrow}</p>
        <h1 className="ui-web-title">{content.title}</h1>
        <p className="ui-web-lede">{content.description}</p>
        <div className="ui-web-platforms" aria-label="Supported platforms">
          {supportedPlatforms.map((item) => (
            <PlatformBadge key={item} className="ui-web-platform-badge">
              {item}
            </PlatformBadge>
          ))}
        </div>
      </section>
    </main>
  );
}
