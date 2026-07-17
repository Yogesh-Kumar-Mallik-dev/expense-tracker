import { HttpError } from "./http";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function positiveInteger(value: string | null, fallback: number, name: string) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(
      400,
      "INVALID_PAGINATION",
      `${name} must be a positive integer`,
      [name],
    );
  }
  return Number(value);
}

export function paginationParams(url: URL) {
  const page = positiveInteger(url.searchParams.get("page"), 1, "page");
  const requestedSize =
    url.searchParams.get("pageSize") ?? url.searchParams.get("limit");
  const pageSize = positiveInteger(
    requestedSize,
    DEFAULT_PAGE_SIZE,
    "pageSize",
  );
  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(
      400,
      "INVALID_PAGINATION",
      `pageSize must not exceed ${MAX_PAGE_SIZE}`,
      ["pageSize"],
    );
  }
  return { page, pageSize };
}

export function paginate<T>(
  values: readonly T[],
  url: URL,
): { data: T[]; meta: PaginationMeta } {
  const { page, pageSize } = paginationParams(url);
  const total = values.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  return {
    data: values.slice(offset, offset + pageSize),
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1 && total > 0,
    },
  };
}
