import { createHash } from "node:crypto";

export const APPLICATION_AUTH_EMAIL_DELIVERY_PORT = Symbol.for(
  "shopana.iam.application-auth-email-delivery-port"
);

export type ApplicationAuthEmailDeliveryPurpose =
  | "email_verification_link"
  | "password_reset_link"
  | "email_otp_sign_in";

interface ApplicationAuthEmailDeliveryRequestBase {
  idempotencyKey: string;
  applicationId: string;
  deliveryProfileId: string;
  recipient: string;
  templateId: string;
}

export type ApplicationAuthEmailDeliveryRequest =
  | (ApplicationAuthEmailDeliveryRequestBase & {
      purpose: "email_verification_link" | "password_reset_link";
      payload: { url: string };
    })
  | (ApplicationAuthEmailDeliveryRequestBase & {
      purpose: "email_otp_sign_in";
      payload: { otp: string };
    });

export type ApplicationAuthEmailDeliveryResult =
  | { accepted: true; messageId: string }
  | { accepted: false; retryable: boolean };

export interface ApplicationAuthEmailDeliveryPort {
  enqueue(
    request: ApplicationAuthEmailDeliveryRequest
  ): Promise<ApplicationAuthEmailDeliveryResult>;
}

export class ApplicationAuthEmailDeliveryUnavailableError extends Error {
  constructor() {
    super(
      "Application authentication email delivery is temporarily unavailable"
    );
    this.name = "ApplicationAuthEmailDeliveryUnavailableError";
  }
}

export async function enqueueApplicationAuthEmail(input: {
  port: ApplicationAuthEmailDeliveryPort;
  request: ApplicationAuthEmailDeliveryRequest;
  timeoutMs?: number;
}): Promise<void> {
  const timeoutMs = input.timeoutMs ?? 3_000;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      input.port.enqueue(input.request),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new ApplicationAuthEmailDeliveryUnavailableError()),
          timeoutMs
        );
      }),
    ]);
    if (
      result.accepted !== true ||
      typeof result.messageId !== "string" ||
      result.messageId.length === 0
    ) {
      throw new ApplicationAuthEmailDeliveryUnavailableError();
    }
  } catch (error) {
    if (error instanceof ApplicationAuthEmailDeliveryUnavailableError) {
      throw error;
    }
    throw new ApplicationAuthEmailDeliveryUnavailableError();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createApplicationAuthEmailIdempotencyKey(input: {
  applicationId: string;
  purpose: ApplicationAuthEmailDeliveryPurpose;
  verificationReference: string;
}): string {
  return createHash("sha256")
    .update("shopana:iam:application-auth-email:v1\0")
    .update(input.applicationId)
    .update("\0")
    .update(input.purpose)
    .update("\0")
    .update(input.verificationReference)
    .digest("base64url");
}

export function normalizeApplicationAuthEmailRecipient(email: string): string {
  const recipient = email.trim().toLowerCase();
  if (!recipient || recipient.length > 320) {
    throw new ApplicationAuthEmailDeliveryUnavailableError();
  }
  return recipient;
}
