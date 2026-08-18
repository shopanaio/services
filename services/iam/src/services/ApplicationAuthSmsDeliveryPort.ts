import { createHash } from "node:crypto";

export const APPLICATION_AUTH_SMS_DELIVERY_PORT = Symbol.for(
  "shopana.iam.application-auth-sms-delivery-port"
);

export interface ApplicationAuthSmsDeliveryRequest {
  applicationId: string;
  recipient: string;
  otp: string;
  idempotencyKey: string;
}

export type ApplicationAuthSmsDeliveryResult =
  | { accepted: true; messageId: string }
  | { accepted: false; retryable: boolean };

export interface ApplicationAuthSmsDeliveryPort {
  enqueue(
    request: ApplicationAuthSmsDeliveryRequest
  ): Promise<ApplicationAuthSmsDeliveryResult>;
}

export function createApplicationAuthSmsIdempotencyKey(input: {
  applicationId: string;
  recipient: string;
  otp: string;
}): string {
  return createHash("sha256")
    .update("shopana:iam:application-auth-sms:v1\0")
    .update(input.applicationId)
    .update("\0")
    .update(input.recipient)
    .update("\0")
    .update(input.otp)
    .digest("base64url");
}

export function normalizeApplicationAuthPhoneRecipient(value: string): string {
  const phone = value.trim();
  if (!/^\+[1-9][0-9]{6,14}$/u.test(phone)) {
    throw new Error("Application authentication phone number is invalid");
  }
  return phone;
}
