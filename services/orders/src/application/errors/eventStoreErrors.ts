/**
 * Event Store specific error types and utilities
 */

export class EventStoreError extends Error {
  constructor(message: string, public readonly code?: string, public readonly details?: unknown) {
    super(message);
    this.name = 'EventStoreError';
  }
}

export class StreamAlreadyExistsError extends EventStoreError {
  constructor(streamId: string, details?: unknown) {
    super(`Stream already exists: ${streamId}`, 'STREAM_ALREADY_EXISTS', details);
    this.name = 'StreamAlreadyExistsError';
  }
}

export class ConcurrencyError extends EventStoreError {
  constructor(streamId: string, expectedVersion: number | string, actualVersion: number, details?: unknown) {
    super(
      `Concurrency conflict on stream ${streamId}: expected version ${expectedVersion}, actual version ${actualVersion}`,
      'CONCURRENCY_CONFLICT',
      details
    );
    this.name = 'ConcurrencyError';
  }
}

/**
 * Determines if an error is related to stream already existing (idempotency case)
 */
export function isStreamAlreadyExistsError(error: unknown): error is StreamAlreadyExistsError {
  return error instanceof StreamAlreadyExistsError ||
    (error instanceof Error && (
      error.message.includes('stream already exists') ||
      error.message.includes('STREAM_ALREADY_EXISTS') ||
      error.message.includes('WrongExpectedVersion') ||
      (error as any).code === 'STREAM_ALREADY_EXISTS'
    ));
}

/**
 * Determines if an error is a concurrency conflict
 */
export function isConcurrencyError(error: unknown): error is ConcurrencyError {
  return error instanceof ConcurrencyError ||
    (error instanceof Error && (
      error.message.includes('concurrency') ||
      error.message.includes('version') ||
      error.message.includes('WrongExpectedVersion') ||
      (error as any).code === 'CONCURRENCY_CONFLICT'
    ));
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
    
    if (isConcurrencyError(error)) {
      // Try to extract version info from error message
      const versionMatch = error.message.match(/expected.*?(\d+).*?actual.*?(\d+)/i);
      const expectedVersion = versionMatch?.[1] ?? 'unknown';
      const actualVersion = parseInt(versionMatch?.[2] ?? '0', 10);
      return new ConcurrencyError(streamId, expectedVersion, actualVersion, error);
    }
  }
  
  // Wrap unknown errors
  return new EventStoreError(
    error instanceof Error ? error.message : String(error),
    'UNKNOWN_EVENT_STORE_ERROR',
    error
  );
}