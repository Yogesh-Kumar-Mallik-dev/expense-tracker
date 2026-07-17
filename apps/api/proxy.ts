import { NextRequest, NextResponse } from "next/server";

const developmentOrigins = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
]);

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const configured = new Set(
    (process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const allowed =
    origin &&
    (configured.has(origin) ||
      (process.env.NODE_ENV !== "production" && developmentOrigins.has(origin)));
  const response =
    request.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();

  if (allowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, X-Request-ID",
    );
    response.headers.set(
      "Access-Control-Expose-Headers",
      "X-Request-ID, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After",
    );
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
  }
  return response;
}

export const config = { matcher: "/api/:path*" };
