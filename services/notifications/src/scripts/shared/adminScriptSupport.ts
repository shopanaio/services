import {
  AuthorizationError,
  KernelError,
} from "@shopana/shared-kernel";
import { ZodError } from "zod";
import type { Repository } from "../../repositories/Repository.js";

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  CHANNEL_DOES_NOT_SUPPORT_TEMPLATES:
    "The selected channel does not support templates",
  CHANNEL_NOT_ALLOWED: "The selected notification channel is not allowed",
  MANDATORY_NOTIFICATION_CANNOT_BE_DISABLED:
    "Mandatory notifications cannot be disabled",
  NOT_A_STAFF_NOTIFICATION:
    "Only staff notification definitions can be assigned to staff recipients",
  SENDER_SETTINGS_REQUIRE_EMAIL_CHANNEL:
    "Sender settings are only supported for the email channel",
  STAFF_RECIPIENT_NOT_FOUND: "Staff notification recipient was not found",
  UNSUPPORTED_WEBHOOK_API_VERSION: "Webhook API version is not supported",
  UNSUPPORTED_WEBHOOK_EVENT: "Webhook event is not supported",
  VERSION_CONFLICT: "The resource was changed by another request",
  WEBHOOK_NOT_FOUND: "Webhook subscription was not found",
  WEBHOOK_SIGNING_SECRET_NOT_FOUND: "Webhook signing secret was not found",
};

const ERROR_FIELDS: Readonly<Record<string, string[]>> = {
  CHANNEL_DOES_NOT_SUPPORT_TEMPLATES: ["channel"],
  CHANNEL_NOT_ALLOWED: ["channel"],
  INVALID_NOTIFICATION_DEFINITION: ["key"],
  MANDATORY_NOTIFICATION_CANNOT_BE_DISABLED: ["enabled"],
  NOT_A_STAFF_NOTIFICATION: ["eventKeys"],
  SENDER_SETTINGS_REQUIRE_EMAIL_CHANNEL: ["channel"],
  STAFF_RECIPIENT_NOT_FOUND: ["id"],
  UNSUPPORTED_WEBHOOK_API_VERSION: ["apiVersion"],
  UNSUPPORTED_WEBHOOK_EVENT: ["eventType"],
  VERSION_CONFLICT: ["expectedVersion"],
  WEBHOOK_NOT_FOUND: ["id"],
};

export interface AdminUserError {
  message: string;
  field?: string[];
  code?: string;
}

export function recordAdminAudit(
  repository: Repository,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  return repository.audit.record({
    action,
    entityType,
    entityId,
    actorId,
    payload,
  });
}

export function adminUserErrors(error: unknown): AdminUserError[] {
  if (error instanceof AuthorizationError) {
    return error.errors.map((item) => ({
      message: item.message,
      code: item.code ?? undefined,
      field: item.field ?? undefined,
    }));
  }

  const normalized = normalizeAdminError(error);
  const issues = readIssues(normalized.details);
  if (issues.length > 0) {
    return issues.map((issue) => ({
      message: issue.message,
      code: issue.code ?? normalized.code,
      field: issue.field,
    }));
  }

  return [
    {
      message: normalized.message,
      code: normalized.code,
      field: ERROR_FIELDS[normalized.code],
    },
  ];
}

export function normalizeAdminError(error: unknown): KernelError {
  if (error instanceof KernelError) return error;

  if (error instanceof ZodError) {
    return new KernelError("Notification input is invalid", "INVALID_INPUT", {
      issues: error.issues.map((issue) => ({
        message: issue.message,
        field: issue.path.map(String),
      })),
    });
  }

  if (error instanceof Error) {
    if (error.message.startsWith("Unknown notification definition")) {
      return new KernelError(
        "Unknown notification definition",
        "INVALID_NOTIFICATION_DEFINITION",
        { field: ["key"] }
      );
    }
    const [code] = error.message.split(":", 1);
    if (code && ERROR_MESSAGES[code]) {
      return new KernelError(ERROR_MESSAGES[code], code, {
        cause: error.message,
      });
    }
  }

  return new KernelError(
    "Notification administration operation failed",
    "INTERNAL_ERROR"
  );
}

function readIssues(
  details: unknown
): Array<{ message: string; code?: string; field?: string[] }> {
  if (
    !details ||
    typeof details !== "object" ||
    !("issues" in details) ||
    !Array.isArray(details.issues)
  ) {
    return [];
  }

  return details.issues.flatMap((issue) => {
    if (!issue || typeof issue !== "object") return [];
    const message =
      "message" in issue && typeof issue.message === "string"
        ? issue.message
        : "Notification input is invalid";
    const code =
      "code" in issue && typeof issue.code === "string"
        ? issue.code
        : undefined;
    const field = readIssueField(issue);
    return [{ message, code, field }];
  });
}

function readIssueField(issue: object): string[] | undefined {
  if ("field" in issue) {
    if (Array.isArray(issue.field)) {
      return issue.field.map(String);
    }
    if (typeof issue.field === "string") {
      const templateField: Readonly<Record<string, string>> = {
        SUBJECT: "subjectTemplate",
        BODY: "bodyTemplate",
        PLAIN_TEXT: "plainTextTemplate",
      };
      return [templateField[issue.field] ?? issue.field];
    }
  }
  return undefined;
}
