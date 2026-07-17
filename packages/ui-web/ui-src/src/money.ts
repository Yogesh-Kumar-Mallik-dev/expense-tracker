const SCALE = 10_000n;

export function parseMoney(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole = "0", fraction = ""] = value.replace(/^[+-]/, "").split(".");
  const amount =
    BigInt(whole) * SCALE + BigInt(fraction.padEnd(4, "0").slice(0, 4));
  return negative ? -amount : amount;
}

export function formatMoney(value: string, currency: string, locale?: string) {
  const amount = parseMoney(value);
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / SCALE;
  const fraction = ((absolute % SCALE) / 100n).toString().padStart(2, "0");
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(0);
  const integer = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(whole);
  return parts
    .map((part) => {
      if (part.type === "minusSign") return "";
      if (part.type === "integer") return `${negative ? "-" : ""}${integer}`;
      if (part.type === "fraction") return fraction;
      return part.value;
    })
    .join("");
}

export function moneyRatio(value: string, total: string) {
  const denominator = parseMoney(total);
  if (denominator <= 0n) return 0;
  return Number((parseMoney(value) * 100n) / denominator);
}
