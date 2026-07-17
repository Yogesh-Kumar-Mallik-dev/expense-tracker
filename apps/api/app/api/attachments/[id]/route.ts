import { deleteResource, getResource } from "../../../../src/resources";
import { route } from "../../../../src/http";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const GET = route((request: Request, context: Context) =>
  getResource("attachments", request, context),
);
export const DELETE = route((request: Request, context: Context) =>
  deleteResource("attachments", request, context),
);
