export type SearchRuntimeErrorCode =
  | "SEARCH_NORMALIZATION_FAILED"
  | "SEARCH_CONFIGURATION_UNAVAILABLE"
  | "SEARCH_INDEX_UNAVAILABLE";

export class SearchRuntimeError extends Error {
  constructor(
    public readonly code: SearchRuntimeErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "SearchRuntimeError";
  }
}

export function normalizationFailure(
  message: string,
  cause?: unknown,
): SearchRuntimeError {
  return new SearchRuntimeError("SEARCH_NORMALIZATION_FAILED", message, cause);
}

export function indexUnavailable(
  message: string,
  cause?: unknown,
): SearchRuntimeError {
  return new SearchRuntimeError("SEARCH_INDEX_UNAVAILABLE", message, cause);
}

export function configurationUnavailable(
  message: string,
  cause?: unknown,
): SearchRuntimeError {
  return new SearchRuntimeError(
    "SEARCH_CONFIGURATION_UNAVAILABLE",
    message,
    cause,
  );
}
