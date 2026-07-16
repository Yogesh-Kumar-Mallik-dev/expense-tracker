import { z } from "zod";

export type IdFactory = () => string;

// Concurrency note: Safe because random UUIDs are generated independently before any row write.
export function createUuid(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("A platform UUID factory is required in this runtime");
  }
  return globalThis.crypto.randomUUID();
}

// Concurrency note: N/A - pure validation that enforces globally unique row IDs before persistence.
export function parseUuid(value: string): string {
  return z.uuid().parse(value);
}
