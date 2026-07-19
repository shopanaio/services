import { createHmac, randomUUID } from "node:crypto";
import type { Logger } from "@shopana/shared-kernel";
import type { ApplicationAuthProviderName } from "../repositories/models/application-auth.js";
import type { ApplicationAuthSecretService } from "./ApplicationAuthSecretService.js";

export const APPLICATION_AUTH_AUDIT_PORT = Symbol.for(
  "shopana.iam.application-auth-audit-port"
);

export type ApplicationAuthAuditAction =
  | "provider_callback"
  | "account_link"
  | "account_unlink";

export type ApplicationAuthAuditReasonCategory =
  | "success"
  | "provider_email_missing"
  | "provider_disabled"
  | "registration_disabled"
  | "implicit_linking_blocked"
  | "email_mismatch"
  | "account_conflict"
  | "session_missing"
  | "session_not_fresh"
  | "last_login_method"
  | "callback_state_invalid"
  | "provider_error"
  | "linking_failed"
  | "invalid_request"
  | "unknown";

export interface ApplicationAuthAuditEvent {
  eventId: string;
  schemaVersion: 1;
  occurredAt: string;
  category: "application_auth_security";
  action: ApplicationAuthAuditAction;
  outcome: "success" | "failure";
  reasonCategory: ApplicationAuthAuditReasonCategory;
  actorType: "anonymous" | "application_user";
  actorId?: string;
  organizationId: string;
  applicationId: string;
  requestId: string;
  safeDiff: Readonly<{
    provider?: ApplicationAuthProviderName;
  }>;
}

/**
 * Production implementations persist the event in an append-only sink with
 * the retention and alerting policy defined by the application-auth plan.
 */
export interface ApplicationAuthAuditPort {
  append(event: ApplicationAuthAuditEvent): Promise<void>;
  incrementDeliveryFailure?(input: {
    applicationId: string;
    action: ApplicationAuthAuditAction;
  }): Promise<void>;
}

export interface RecordApplicationAuthAuditEventInput {
  action: ApplicationAuthAuditAction;
  outcome: "success" | "failure";
  reasonCategory: ApplicationAuthAuditReasonCategory;
  actorType: "anonymous" | "application_user";
  actorId?: string;
  organizationId: string;
  applicationId: string;
  secretKeyVersion: number;
  requestId: string;
  provider?: ApplicationAuthProviderName;
}

/**
 * Central redaction boundary for runtime social/linking audit events.
 *
 * Operational audit delivery is deliberately non-blocking for the auth flow.
 * The optional port owns durable append-only persistence and its failure
 * counter; the fallback emits only the already-redacted event.
 */
export class ApplicationAuthAuditService {
  constructor(
    private readonly secrets: ApplicationAuthSecretService,
    private readonly logger: Logger,
    private readonly port?: ApplicationAuthAuditPort,
    private readonly now: () => Date = () => new Date()
  ) {}

  async record(input: RecordApplicationAuthAuditEventInput): Promise<void> {
    const event: ApplicationAuthAuditEvent = Object.freeze({
      eventId: randomUUID(),
      schemaVersion: 1,
      occurredAt: this.now().toISOString(),
      category: "application_auth_security",
      action: input.action,
      outcome: input.outcome,
      reasonCategory: input.reasonCategory,
      actorType: input.actorType,
      ...(input.actorId
        ? {
            actorId: this.createOpaqueActorId(
              input.applicationId,
              input.secretKeyVersion,
              input.actorId
            ),
          }
        : {}),
      organizationId: input.organizationId,
      applicationId: input.applicationId,
      requestId: input.requestId,
      safeDiff: Object.freeze({
        ...(input.provider ? { provider: input.provider } : {}),
      }),
    });

    if (!this.port) {
      this.logger.info(event, "Application auth security audit event");
      return;
    }

    try {
      await this.port.append(event);
    } catch {
      this.logger.error(
        {
          applicationId: input.applicationId,
          action: input.action,
          requestId: input.requestId,
        },
        "Application auth security audit delivery failed"
      );
      try {
        await this.port.incrementDeliveryFailure?.({
          applicationId: input.applicationId,
          action: input.action,
        });
      } catch {
        this.logger.error(
          {
            applicationId: input.applicationId,
            action: input.action,
          },
          "Application auth audit failure counter update failed"
        );
      }
    }
  }

  private createOpaqueActorId(
    applicationId: string,
    secretKeyVersion: number,
    actorId: string
  ): string {
    const secret = this.secrets.derivePurposeSecret(
      applicationId,
      secretKeyVersion,
      "security-audit"
    );
    return createHmac("sha256", secret)
      .update(actorId, "utf8")
      .digest("base64url");
  }
}
