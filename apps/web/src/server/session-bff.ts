import { cookies } from "next/headers";
import { z } from "zod";
import { sessionSchema, userSchema } from "@expense-tracker/client-core";

const COOKIE = "expense_tracker_refresh";
const apiBaseUrl = () =>
  (process.env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const refreshEnvelope = z.object({
  data: z.object({
    tokens: z.object({
      accessToken: z.string().min(1),
      refreshToken: z.string().min(1),
      expiresIn: z.number().positive(),
    }),
  }),
});
const userEnvelope = z.object({ data: userSchema });

export async function handleSessionAction(request: Request, action: string) {
  if (!hasSameOrigin(request))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Cross-origin session request rejected",
        },
      },
      { status: 403 },
    );
  if (!["login", "register", "refresh", "logout"].includes(action))
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Session action not found" } },
      { status: 404 },
    );
  const jar = await cookies();
  const currentRefresh = jar.get(COOKIE)?.value ?? null;
  if (action === "logout") {
    const response = await callApi("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: currentRefresh ?? "" }),
      headers: request.headers.get("authorization")
        ? { authorization: request.headers.get("authorization")! }
        : {},
    });
    jar.delete(COOKIE);
    return response.status === 401 || response.ok
      ? new Response(null, { status: 204 })
      : forward(response);
  }
  if (action === "refresh") {
    if (!currentRefresh)
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "No web session exists" } },
        { status: 401 },
      );
    const refreshed = await callApi("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: currentRefresh }),
    });
    if (!refreshed.ok) {
      jar.delete(COOKIE);
      return forward(refreshed);
    }
    const parsed = refreshEnvelope.safeParse(await refreshed.json());
    if (!parsed.success) return invalidUpstream();
    const userResponse = await callApi("/api/users/me", {
      headers: {
        authorization: `Bearer ${parsed.data.data.tokens.accessToken}`,
      },
    });
    if (!userResponse.ok) {
      jar.delete(COOKIE);
      return forward(userResponse);
    }
    const user = userEnvelope.safeParse(await userResponse.json());
    if (!user.success) return invalidUpstream();
    setRefreshCookie(jar, parsed.data.data.tokens.refreshToken);
    return Response.json({
      data: {
        user: user.data.data,
        tokens: {
          accessToken: parsed.data.data.tokens.accessToken,
          expiresIn: parsed.data.data.tokens.expiresIn,
        },
      },
    });
  }

  const payload = await request.text();
  const response = await callApi(`/api/auth/${action}`, {
    method: "POST",
    body: payload,
  });
  if (!response.ok) return forward(response);
  const session = sessionSchema.safeParse((await response.json()).data);
  if (!session.success || !session.data.tokens.refreshToken)
    return invalidUpstream();
  setRefreshCookie(jar, session.data.tokens.refreshToken);
  return Response.json(
    {
      data: {
        user: session.data.user,
        tokens: {
          accessToken: session.data.tokens.accessToken,
          expiresIn: session.data.tokens.expiresIn,
        },
      },
    },
    { status: action === "register" ? 201 : 200 },
  );
}

function setRefreshCookie(
  jar: Awaited<ReturnType<typeof cookies>>,
  value: string,
) {
  jar.set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/backend/session",
    maxAge: 30 * 24 * 60 * 60,
  });
}

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function callApi(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body) headers.set("content-type", "application/json");
  return fetch(`${apiBaseUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

async function forward(response: Response) {
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
      "X-Request-ID": response.headers.get("X-Request-ID") ?? "",
    },
  });
}

function invalidUpstream() {
  return Response.json(
    {
      error: {
        code: "INVALID_UPSTREAM_RESPONSE",
        message: "The authentication service returned an invalid response",
      },
    },
    { status: 502 },
  );
}
