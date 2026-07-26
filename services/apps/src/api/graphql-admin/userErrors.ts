import { AuthorizationError } from "@shopana/shared-kernel";
import { TypeAuthorizationError } from "@shopana/type-resolver";
import { ZodError } from "zod";

export interface AppsUserError {
  readonly message: string;
  readonly field: readonly string[] | null;
  readonly code: string;
}

export function toAppsUserErrors(
  error: unknown,
  fallbackCode: string,
  fieldPrefix: readonly string[] = ["input"],
): AppsUserError[] {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => ({
      message: issue.message,
      field: [...fieldPrefix, ...issue.path.map(String)],
      code: "INVALID_INPUT",
    }));
  }
  if (
    error instanceof AuthorizationError ||
    error instanceof TypeAuthorizationError
  ) {
    return [
      {
        message: "Access denied",
        field: null,
        code: "FORBIDDEN",
      },
    ];
  }

  const message = error instanceof Error ? error.message : String(error);
  return [
    {
      message,
      field: inferField(message, fieldPrefix),
      code: inferCode(message, fallbackCode),
    },
  ];
}

function inferCode(message: string, fallbackCode: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("not found")) return "NOT_FOUND";
  if (normalized.includes("version conflict")) return "CONFLICT";
  if (normalized.includes("already")) return "ALREADY_EXISTS";
  if (normalized.includes("cannot ")) return "INVALID_STATE";
  if (normalized.includes("undeclared scope")) return "INVALID_SCOPE";
  if (normalized.includes("required")) return "INVALID_INPUT";
  if (normalized.includes("invalid")) return "INVALID_INPUT";
  return fallbackCode;
}

function inferField(
  message: string,
  fieldPrefix: readonly string[],
): readonly string[] | null {
  const match = message.match(
    /^(appCode|installationId|connectionId|specificationId|clientMutationId|expectedConfigurationVersion) is (?:required|invalid)(?: .*)?$/,
  );
  return match?.[1] ? [...fieldPrefix, match[1]] : null;
}
