export class EventStoreError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "EventStoreError";
  }
}

export class StreamAlreadyExistsError extends EventStoreError {
  constructor(streamId: string, details?: unknown) {
    super(`Stream already exists: ${streamId}`, "STREAM_ALREADY_EXISTS", details);
    this.name = "StreamAlreadyExistsError";
  }
}

export class ConcurrencyError extends EventStoreError {
  constructor(
    streamId: string,
    expectedVersion: number | string,
    actualVersion: number,
    details?: unknown,
  ) {
    super(
      `Concurrency conflict on stream ${streamId}: expected version ${expectedVersion}, actual version ${actualVersion}`,
      "CONCURRENCY_CONFLICT",
      details,
    );
    this.name = "ConcurrencyError";
  }
}
