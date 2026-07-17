import { ZodError } from "zod";

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

export function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
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
      { error: { code: error.code, message: error.message, fields: error.fields } },
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
        { error: { code: "CONFLICT", message: "A unique record already exists" } },
        { status: 409 },
      );
    }
    if (error.code === "P2003") {
      return Response.json(
        { error: { code: "MISSING_PARENT", message: "A related record does not exist" } },
        { status: 409 },
      );
    }
  }
  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}

export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handle(error);
    }
  };
}
