import { handleSessionAction } from "../../../../src/server/session-bff";

type Context = { params: Promise<{ action: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: Context) {
  return handleSessionAction(request, (await context.params).action);
}
