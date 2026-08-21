/**
 * Event Store specific error types and utilities
 */

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

/**
 * Determines if an error is related to stream already existing (idempotency case)
 */
export function isStreamAlreadyExistsError(error: unknown): error is StreamAlreadyExistsError {
  return (
    error instanceof StreamAlreadyExistsError ||
    (error instanceof Error &&
      (error.message.includes("stream already exists") ||
        error.message.includes("STREAM_ALREADY_EXISTS") ||
        (error as any).code === "STREAM_ALREADY_EXISTS"))
  );
}

/**
 * Maps Event Store adapter errors to our domain errors
 */
export function mapEventStoreError(error: unknown, streamId: string): Error {
  if (error instanceof Error) {
    // Check for different Event Store error patterns
    if (isStreamAlreadyExistsError(error)) {
      return new StreamAlreadyExistsError(streamId, error);
    }
  }

  // Wrap unknown errors
  return new EventStoreError(
    error instanceof Error ? error.message : String(error),
    "UNKNOWN_EVENT_STORE_ERROR",
    error,
  );
}
