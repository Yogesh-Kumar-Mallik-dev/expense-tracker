const BLOCKED_FIELD =
  /authorization|cookie|token|password|secret|query|sql|body/i;

export function safeFields(
  fields: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null> {
  if (!fields) return {};
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (BLOCKED_FIELD.test(key)) continue;
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = value;
    }
  }
  return safe;
}

export function normalizeError(
  error: unknown,
  errorId: string,
): import("./types").StructuredError {
  if (error instanceof Error) {
    const value = error as Error & { code?: unknown; cause?: unknown };
    return {
      errorId,
      name: value.name,
      message: value.message,
      code:
        typeof value.code === "string" || typeof value.code === "number"
          ? String(value.code)
          : null,
      cause: value.cause === undefined ? null : safeString(value.cause),
      stack: value.stack ?? null,
    };
  }
  return {
    errorId,
    name: "UnknownError",
    message: safeString(error),
    code: null,
    cause: null,
    stack: null,
  };
}

function safeString(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
