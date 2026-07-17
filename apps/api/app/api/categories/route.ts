import { createResource, listResource } from "../../../src/resources";
import { route } from "../../../src/http";
export const runtime = "nodejs";
export const GET = route((request: Request) =>
  listResource("categories", request),
);
export const POST = route((request: Request) =>
  createResource("categories", request),
);
