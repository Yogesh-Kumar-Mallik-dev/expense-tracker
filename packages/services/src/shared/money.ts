const SCALE = 10_000n;
// Concurrency note: N/A - pure fixed-point parsing with no database state.
export function parseMoney(value: string): bigint {
  const sign = value.startsWith("-") ? -1n : 1n;
  const raw = value.replace(/^[+-]/, "");
  const [whole = "0", fraction = ""] = raw.split(".");
  return (
    sign * (BigInt(whole) * SCALE + BigInt(fraction.padEnd(4, "0").slice(0, 4)))
  );
}
// Concurrency note: N/A - pure fixed-point formatting with no database state.
export function formatMoney(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / SCALE}.${(absolute % SCALE).toString().padStart(4, "0")}`;
}
