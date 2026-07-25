import { KernelError } from "@shopana/shared-kernel";
import { ZodError } from "zod";
import { BaseScript } from "../../kernel/BaseScript.js";

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  CHANNEL_DOES_NOT_SUPPORT_TEMPLATES:
    "The selected channel does not support templates",
  CHANNEL_NOT_ALLOWED: "The selected notification channel is not allowed",
  FORBIDDEN: "You are not allowed to perform this operation",
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
  WEBHOOK_SIGNING_SECRET_NOT_FOUND: "Webhook signing secret was not found",
};

export abstract class BaseAdminScript<TParams, TResult> extends BaseScript<
  TParams,
  TResult
> {
  protected async authorize(resource: string, action: string): Promise<void> {
    const allowed = await this.authProvider.authorize({
      organizationId: this.context.store.organizationId,
      organizationName: this.context.store.name,
      resource,
      action,
    });
    if (!allowed) {
      throw new KernelError(ERROR_MESSAGES.FORBIDDEN!, "FORBIDDEN");
    }
  }

  protected audit(
    action: string,
    entityType: string,
    entityId: string,
    payload?: Record<string, unknown>
  ): Promise<void> {
    return this.repository.audit.record({
      action,
      entityType,
      entityId,
      actorId: this.context.user.id,
      payload,
    });
  }

  protected handleError(error: unknown): never {
    throw normalizeAdminError(error);
  }
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
