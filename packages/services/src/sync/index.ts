export type SyncConflictKind =
  | "UNIQUE_CONSTRAINT"
  | "MISSING_PARENT"
  | "VALIDATION_REJECTED";
export interface SyncConflict {
  kind: SyncConflictKind;
  entity: string;
  recordId: string;
  message: string;
  fields: string[];
  recovery: "RENAME" | "MERGE" | "RECREATE_PARENT" | "EDIT";
}
export interface PartialWorkflowState {
  primaryRecordId: string;
  pendingSteps: string[];
  completedSteps: string[];
}
export class PermanentSyncConflictError extends Error {
  constructor(readonly conflict: SyncConflict) {
    super(conflict.message);
    this.name = "PermanentSyncConflictError";
  }
}
// Concurrency note: N/A - creates an explicit UI recovery state and performs no database write.
export function partialWorkflow(
  primaryRecordId: string,
  completedSteps: string[],
  pendingSteps: string[],
): PartialWorkflowState {
  return {
    primaryRecordId,
    completedSteps: [...completedSteps],
    pendingSteps: [...pendingSteps],
  };
}
// Concurrency note: N/A - pure error classification; the caller decides whether to retry or request user recovery.
export function isPermanentSyncConflict(
  error: unknown,
): error is PermanentSyncConflictError {
  return error instanceof PermanentSyncConflictError;
}
