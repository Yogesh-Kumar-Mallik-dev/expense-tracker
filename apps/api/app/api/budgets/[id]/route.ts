import {
  deleteResource,
  getResource,
  updateResource,
} from "../../../../src/resources";
import { route } from "../../../../src/http";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const GET = route((request: Request, context: Context) =>
  getResource("budgets", request, context),
);
export const PATCH = route((request: Request, context: Context) =>
  updateResource("budgets", request, context),
);
export const DELETE = route((request: Request, context: Context) =>
  deleteResource("budgets", request, context),
);
