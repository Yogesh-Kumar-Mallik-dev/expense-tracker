export type Clock = () => string;

// Concurrency note: N/A - supplies audit metadata only; timestamps are not used for conflict resolution.
export function systemClock(): string {
  return new Date().toISOString();
}
