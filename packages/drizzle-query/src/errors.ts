export class QueryBuilderError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "QueryBuilderError";
  }
}

export class InvalidFilterError extends QueryBuilderError {
  constructor(field: string, reason: string) {
    super(`Invalid filter for "${field}": ${reason}`, "INVALID_FILTER");
  }
}

export class JoinDepthExceededError extends QueryBuilderError {
  constructor(depth: number, max: number) {
    super(`Join depth ${depth} exceeds maximum ${max}`, "JOIN_DEPTH_EXCEEDED");
  }
}

export class UnknownFieldError extends QueryBuilderError {
  constructor(field: string) {
    super(`Unknown field "${field}" in query input`, "UNKNOWN_FIELD");
  }
}
