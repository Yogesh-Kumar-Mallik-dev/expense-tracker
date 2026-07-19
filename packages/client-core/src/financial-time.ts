const FINANCIAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface FinancialDayRange {
  from: string;
  to: string;
}

export function isIanaTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function financialDayRange(
  from: string,
  to: string,
  timezone: string,
): FinancialDayRange {
  assertFinancialDate(from);
  assertFinancialDate(to);
  if (!isIanaTimezone(timezone))
    throw new Error(`Invalid IANA financial timezone: ${timezone}`);
  if (from > to) throw new Error("Financial date range is reversed");

  const start = zonedMidnight(from, timezone);
  const endExclusive = zonedMidnight(nextDate(to), timezone);
  return {
    from: new Date(start).toISOString(),
    to: new Date(endExclusive - 1).toISOString(),
  };
}

function zonedMidnight(value: string, timezone: string) {
  const [year, month, day] = dateParts(value);
  const target = Date.UTC(year, month - 1, day);
  let result = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const values = Object.fromEntries(
      formatter
        .formatToParts(new Date(result))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const part = (name: string): number => {
      const value = values[name];
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`Timezone formatter omitted ${name}`);
      return value;
    };
    const represented = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    );
    const adjusted = result + (target - represented);
    if (adjusted === result) return result;
    result = adjusted;
  }
  return result;
}

function assertFinancialDate(value: string) {
  const [year, month, day] = dateParts(value);
  const normalized = new Date(Date.UTC(year, month - 1, day))
    .toISOString()
    .slice(0, 10);
  if (normalized !== value) throw new Error(`Invalid financial date: ${value}`);
}

function dateParts(value: string): [number, number, number] {
  const match = FINANCIAL_DATE.exec(value);
  if (!match) throw new Error(`Invalid financial date: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function nextDate(value: string) {
  const [year, month, day] = dateParts(value);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}
