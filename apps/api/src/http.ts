import { ZodError } from "zod";
import {
  createRequestScope,
  currentRequest,
  nextErrorId,
  runWithRequest,
} from "@expense-tracker/logger/node";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "./rate-limit";
import { apiLogger } from "./logger";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: string[],
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function ok<T, TMeta = never>(data: T, status = 200, meta?: TMeta) {
  return Response.json(meta === undefined ? { data } : { data, meta }, {
    status,
  });
}

export function empty() {
  return new Response(null, { status: 204 });
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpError(400, "INVALID_BODY", "Expected a JSON object");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "INVALID_JSON", "Request body is not valid JSON");
  }
}

export function handle(error: unknown, errorId?: string) {
  if (error instanceof HttpError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields,
          errorId,
          ...error.details,
        },
      },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          fields: error.issues.map((issue) => issue.path.join(".")),
          errorId,
        },
      },
      { status: 400 },
    );
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code === "P2002") {
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "A unique record already exists",
            errorId,
          },
        },
        { status: 409 },
      );
    }
    if (error.code === "P2003") {
      return Response.json(
        {
          error: {
            code: "MISSING_PARENT",
            message: "A related record does not exist",
            errorId,
          },
        },
        { status: 409 },
      );
    }
  }
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        errorId,
      },
    },
    { status: 500 },
  );
}

export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    const request = args[0];
    if (!(request instanceof Request)) {
      try {
        return await handler(...args);
      } catch (error) {
        return handle(error);
      }
    }
    const scope = createRequestScope(request, {
      trustProxy: process.env.TRUST_PROXY === "true",
    });
    return runWithRequest(scope, async () => {
      const limit = checkRateLimit(request);
      if (!limit.allowed) {
        const response = Response.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests; retry after the current window",
            },
          },
          {
            status: 429,
            headers: {
              ...rateLimitHeaders(limit),
              "Retry-After": String(limit.retryAfter),
            },
          },
        );
        return finishLoggedResponse(response, limit, "Request rate limited");
      }
      try {
        const response = withRateLimitHeaders(await handler(...args), limit);
        return finishLoggedResponse(response, limit);
      } catch (error) {
        const errorId = nextErrorId(scope);
        apiLogger.exception(scope.request, error, errorId, {
          handler: `${request.method} ${new URL(request.url).pathname}`,
        });
        const response = withRateLimitHeaders(handle(error, errorId), limit);
        return finishLoggedResponse(response, limit, `Error: ${errorId}`);
      }
    });
  };
}

function withRateLimitHeaders(
  response: Response,
  limit: RateLimitResult | undefined,
) {
  if (!limit) return response;
  for (const [name, value] of Object.entries(rateLimitHeaders(limit))) {
    response.headers.set(name, value);
  }
  return response;
}

function finishLoggedResponse(
  response: Response,
  limit: RateLimitResult,
  message?: string,
) {
  const scope = currentRequest();
  if (!scope) return response;
  const durationMs = performance.now() - scope.request.startedAt;
  const sizeHeader = response.headers.get("content-length");
  const sizeBytes =
    sizeHeader !== null && /^\d+$/.test(sizeHeader) ? Number(sizeHeader) : null;
  const input = {
    kind: "request" as const,
    request: scope.request,
    response: {
      status: response.status,
      durationMs,
      success: response.status < 400,
      sizeBytes,
    },
    rateLimit: {
      limit: limit.limit,
      remaining: limit.remaining,
      resetAt: limit.resetAt,
      blocked: !limit.allowed,
    },
    handler: `${scope.request.method} ${scope.request.path}`,
    message:
      message ??
      (response.status < 400
        ? "Request completed"
        : "Request completed with a client error"),
  };
  if (response.status >= 500) apiLogger.error(input);
  else if (response.status >= 400) apiLogger.warn(input);
  else apiLogger.success(input);
  response.headers.set("X-Request-ID", scope.request.requestId);
  return response;
}
