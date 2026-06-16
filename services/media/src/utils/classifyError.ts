import type { DeletionErrorCode } from "../types/deletion.js";

export class MissingMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingMetadataError";
  }
}

const FATAL_S3_CODES = [
  "AccessDenied",
  "InvalidAccessKeyId",
  "SignatureDoesNotMatch",
  "NoSuchBucket",
];

function isS3Error(
  error: unknown
): error is { Code?: string; code?: string; $metadata?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    ("$metadata" in error || "Code" in error || "code" in error)
  );
}

export function classifyError(error: unknown): DeletionErrorCode {
  if (isS3Error(error)) {
    const code = error.Code ?? error.code;
    if (code && FATAL_S3_CODES.includes(code)) {
      return "FATAL";
    }
    return "RETRYABLE";
  }

  if (error instanceof MissingMetadataError) {
    return "FATAL";
  }

  return "RETRYABLE";
}
