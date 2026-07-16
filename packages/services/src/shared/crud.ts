import type { IdFactory } from "./id";
import { createUuid, parseUuid } from "./id";
import type { Clock } from "./time";
import { systemClock } from "./time";

export interface CrudRepositoryPort<TRecord, TUpdate> {
  create(value: TRecord): Promise<unknown>;
  findById(id: string, userId: string): Promise<TRecord | null>;
  update(
    id: string,
    userId: string,
    value: TUpdate & { updatedAt: string },
  ): Promise<unknown>;
  delete(id: string, userId: string): Promise<unknown>;
}

export abstract class SingleRowService<TRecord, TCreate, TUpdate> {
  protected constructor(
    protected readonly repository: CrudRepositoryPort<TRecord, TUpdate>,
    protected readonly idFactory: IdFactory = createUuid,
    protected readonly clock: Clock = systemClock,
  ) {}

  // Concurrency note: N/A - subclasses only validate and construct a new record from explicit input.
  protected abstract build(input: TCreate, id: string, now: string): TRecord;
  // Concurrency note: N/A - subclasses validate direct replacement fields without reading persisted state.
  protected abstract parseUpdate(input: TUpdate): TUpdate;

  // Concurrency note: Safe single-row insert with an independently assigned UUID; uniqueness conflicts are surfaced rather than pre-checked.
  async create(input: TCreate): Promise<TRecord> {
    const record = this.build(input, parseUuid(this.idFactory()), this.clock());
    await this.repository.create(record);
    return record;
  }

  // Concurrency note: Safe read-only lookup; no read value is persisted implicitly.
  get(id: string, userId: string) {
    return this.repository.findById(parseUuid(id), parseUuid(userId));
  }

  // Concurrency note: Safe single-row replacement of explicit fields; it never derives a write from stored state.
  async update(id: string, userId: string, input: TUpdate) {
    await this.repository.update(parseUuid(id), parseUuid(userId), {
      ...this.parseUpdate(input),
      updatedAt: this.clock(),
    });
  }

  // Concurrency note: Safe idempotent single-row tombstone delegated to a soft-delete repository operation.
  async delete(id: string, userId: string) {
    await this.repository.delete(parseUuid(id), parseUuid(userId));
  }
}
