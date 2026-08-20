import { FatalError } from "@shopana/shared-kernel";

export type RecommendationIntegrityCode =
  | "INVALID_EVENT_PAYLOAD"
  | "EVENT_PAYLOAD_CONFLICT"
  | "STALE_INPUT"
  | "UNSUPPORTED_MODEL_VERSION"
  | "CANDIDATE_LIMIT_EXCEEDED"
  | "INVALID_SNAPSHOT_CONTENT"
  | "LIFECYCLE_PLAN_LIMIT_EXCEEDED";

export class RecommendationIntegrityError extends FatalError {
  constructor(code: RecommendationIntegrityCode, message: string) {
    super(message, undefined, code);
    this.name = "RecommendationIntegrityError";
  }
}

export function isPgConstraint(error: unknown, names: readonly string[]): boolean {
  const candidate = error as { code?: unknown; constraint?: unknown };
  return (
    (candidate.code === "23P01" || candidate.code === "23505") &&
    typeof candidate.constraint === "string" &&
    names.includes(candidate.constraint)
  );
}
