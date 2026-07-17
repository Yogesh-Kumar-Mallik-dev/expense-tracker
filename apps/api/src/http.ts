import { ZodError } from "zod";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "./rate-limit";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: string[],
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

export function handle(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields,
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
          },
        },
        { status: 409 },
      );
    }
  }
  console.error(error);
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
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
    const limit =
      request instanceof Request ? checkRateLimit(request) : undefined;
    if (limit && !limit.allowed) {
      return Response.json(
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
    }
    try {
      return withRateLimitHeaders(await handler(...args), limit);
    } catch (error) {
      return withRateLimitHeaders(handle(error), limit);
    }
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
