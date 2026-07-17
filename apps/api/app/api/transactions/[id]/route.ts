import { deleteResource, getResource, updateResource } from "../../../../src/resources";
import { route } from "../../../../src/http";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const GET = route((request: Request, context: Context) => getResource("transactions", request, context));
export const PATCH = route((request: Request, context: Context) => updateResource("transactions", request, context));
export const DELETE = route((request: Request, context: Context) => deleteResource("transactions", request, context));
