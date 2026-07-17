import type { RequestMetadata } from "./types";

let sequence = 0;
const observedIncoming = new Set<string>();
const MAX_OBSERVED_IDS = 10_000;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

export interface RequestScope {
  request: RequestMetadata;
  nextError: number;
}

export function createRequestScope(
  request: Request,
  options: {
    now?: number;
    random?: () => string;
    trustProxy?: boolean;
  } = {},
): RequestScope {
  const now = options.now ?? Date.now();
  sequence += 1;
  const incoming = request.headers.get("x-request-id");
  const accepted = incoming !== null && REQUEST_ID.test(incoming);
  const duplicateRequestId = accepted && observedIncoming.has(incoming);
  if (accepted) {
    if (observedIncoming.size >= MAX_OBSERVED_IDS) observedIncoming.clear();
    observedIncoming.add(incoming);
  }
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const client = describeClient(userAgent);
  return {
    request: {
      requestId: accepted
        ? incoming
        : generatedRequestId(now, sequence, options.random),
      sequence,
      requestIdSource: accepted ? "incoming" : "generated",
      duplicateRequestId,
      method: request.method,
      path: new URL(request.url).pathname,
      ip: clientIp(request, options.trustProxy ?? false),
      source: detectSource(request, userAgent),
      browser: client.browser,
      client: client.client,
      userAgent,
      startedAt: performance.now(),
      userId: null,
    },
    nextError: 1,
  };
}

export function nextErrorId(scope: RequestScope) {
  const suffix = String(scope.nextError).padStart(2, "0");
  scope.nextError += 1;
  return `${scope.request.requestId}-E${suffix}`;
}

export function setRequestUser(scope: RequestScope, userId: string) {
  scope.request.userId = userId;
}

export function resetRequestIdsForTests() {
  sequence = 0;
  observedIncoming.clear();
}

function generatedRequestId(
  now: number,
  value: number,
  random = () => Math.random().toString(36).slice(2, 6),
) {
  const date = new Date(now).toISOString().slice(0, 10).replaceAll("-", "");
  return `ET-${date}-${String(value).padStart(6, "0")}-${random().slice(0, 4).toUpperCase().padEnd(4, "0")}`;
}

function clientIp(request: Request, trustProxy: boolean) {
  if (!trustProxy) return "unavailable";
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function detectSource(request: Request, userAgent: string) {
  const explicit = request.headers.get("x-expense-tracker-client");
  if (explicit && /^(WEB|DESKTOP|IOS|ANDROID)$/.test(explicit)) return explicit;
  if (/Tauri/i.test(userAgent)) return "DESKTOP";
  if (/Android/i.test(userAgent)) return "ANDROID";
  if (/iPhone|iPad/i.test(userAgent)) return "IOS";
  return "BROWSER";
}

function describeClient(userAgent: string) {
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Chrome\//i.test(userAgent)
      ? "Chrome"
      : /Firefox\//i.test(userAgent)
        ? "Firefox"
        : /Safari\//i.test(userAgent)
          ? "Safari"
          : "Unknown";
  const client = /Mobile|Android|iPhone|iPad/i.test(userAgent)
    ? "Mobile"
    : /Tauri/i.test(userAgent)
      ? "Desktop app"
      : "Desktop";
  return { browser, client };
}
