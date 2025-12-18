import type { CasdoorApiResponse } from "../types/api.js";

export class CasdoorHttpError extends Error {
  public readonly name = "CasdoorHttpError";
  public readonly status?: number;
  public readonly headers?: Record<string, unknown>;
  public readonly responseBody?: unknown;
  public readonly cause?: unknown;

  constructor(message: string, opts?: { status?: number; headers?: Record<string, unknown>; responseBody?: unknown; cause?: unknown }) {
    super(message);
    this.status = opts?.status;
    this.headers = opts?.headers;
    this.responseBody = opts?.responseBody;
    this.cause = opts?.cause;
  }
}

export class CasdoorApiError extends Error {
  public readonly name = "CasdoorApiError";
  public readonly response: CasdoorApiResponse;

  constructor(message: string, response: CasdoorApiResponse) {
    super(message);
    this.response = response;
  }
}

export class CasdoorInvalidResponseError extends Error {
  public readonly name = "CasdoorInvalidResponseError";
  public readonly responseBody: unknown;

  constructor(message: string, responseBody: unknown) {
    super(message);
    this.responseBody = responseBody;
  }
}

