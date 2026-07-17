import {
  deleteResource,
  getResource,
  updateResource,
} from "../../../../src/resources";
import { route } from "../../../../src/http";
export const runtime = "nodejs";
export const GET = route(
  (request: Request, context: { params: Promise<{ id: string }> }) =>
    getResource("accounts", request, context),
);
export const PATCH = route(
  (request: Request, context: { params: Promise<{ id: string }> }) =>
    updateResource("accounts", request, context),
);
export const DELETE = route(
  (request: Request, context: { params: Promise<{ id: string }> }) =>
    deleteResource("accounts", request, context),
);
