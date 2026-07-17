import { createResource, listResource } from "../../../src/resources";
import { route } from "../../../src/http";
export const runtime = "nodejs";
export const GET = route((request: Request) =>
  listResource("accounts", request),
);
export const POST = route((request: Request) =>
  createResource("accounts", request),
);
