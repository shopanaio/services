type PreloadFailureKind = "not-found" | "error";

const preloadFailures = new WeakMap<object, PreloadFailureKind>();

/** Error thrown by $preload() when its root aggregate does not exist. */
export class PreloadNotFoundError extends Error {
  constructor(message = "Root object not found") {
    super(message);
    this.name = "PreloadNotFoundError";
  }
}

class NonErrorPreloadFailure {
  constructor(readonly originalError: unknown) {}
}

function asObject(error: unknown): object {
  if ((typeof error === "object" && error !== null) || typeof error === "function") {
    return error;
  }

  return new NonErrorPreloadFailure(error);
}

/** Marks a failure as originating from the lazy $preload() promise. */
export function markPreloadFailure(error: unknown): unknown {
  const failure = asObject(error);

  if (!preloadFailures.has(failure)) {
    preloadFailures.set(failure, error instanceof PreloadNotFoundError ? "not-found" : "error");
  }

  return failure;
}

/** Returns how a marked preload failed, or undefined for regular errors. */
export function getPreloadFailureKind(error: unknown): PreloadFailureKind | undefined {
  if ((typeof error !== "object" || error === null) && typeof error !== "function") {
    return undefined;
  }

  return preloadFailures.get(error);
}
