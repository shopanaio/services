import type { EmailDeliveryInput, NotificationDeliveryReceipt } from "@shopana/broker-types";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import {
  DEFAULT_SMTP_DEPLOYMENT_POLICY,
  type SmtpConfiguration,
  type SmtpDeploymentPolicy,
} from "./configuration.js";
import { smtpConfigurationError, validateSmtpPassword } from "./configuration.js";
import { resolvePublicSmtpEndpoints, type ResolvedSmtpEndpoint } from "./network.js";

export interface SmtpDeliveryCredentials {
  readonly username?: string;
  readonly password?: string;
}

interface SmtpTransporter {
  sendMail(
    options: Parameters<ReturnType<typeof nodemailer.createTransport>["sendMail"]>[0],
  ): Promise<SMTPTransport.SentMessageInfo>;
  close(): void;
}

export interface SmtpDeliveryDependencies {
  readonly resolveEndpoints: (
    host: string,
    allowPrivateNetwork: boolean,
  ) => Promise<readonly ResolvedSmtpEndpoint[]>;
  readonly createTransport: (options: SMTPTransport.Options) => SmtpTransporter;
  readonly now: () => Date;
}

const defaultDependencies: SmtpDeliveryDependencies = {
  resolveEndpoints: resolvePublicSmtpEndpoints,
  createTransport: (options) => nodemailer.createTransport(options),
  now: () => new Date(),
};

export async function deliverEmail(
  configuration: SmtpConfiguration,
  credentials: SmtpDeliveryCredentials,
  delivery: EmailDeliveryInput,
  policy: SmtpDeploymentPolicy = DEFAULT_SMTP_DEPLOYMENT_POLICY,
  dependencies: SmtpDeliveryDependencies = defaultDependencies,
): Promise<NotificationDeliveryReceipt> {
  if (configuration.security === "NONE" && !policy.allowInsecureSmtp) {
    throw smtpConfigurationError(
      "SMTP_INSECURE_NOT_ALLOWED",
      "Insecure SMTP is disabled by deployment configuration",
    );
  }
  if (!delivery.from?.email) {
    throw smtpConfigurationError(
      "SMTP_SENDER_REQUIRED",
      "Email sender must be configured before SMTP delivery",
    );
  }
  if (configuration.username && !credentials.password) {
    throw smtpConfigurationError(
      "SMTP_PASSWORD_REQUIRED",
      "SMTP password secret is required when username is configured",
    );
  }
  const password = credentials.password ? validateSmtpPassword(credentials.password) : undefined;

  let endpoints: readonly ResolvedSmtpEndpoint[];
  try {
    endpoints = await dependencies.resolveEndpoints(configuration.host, policy.allowPrivateNetwork);
  } catch (error) {
    const failure = normalizeSmtpError(error);
    if (failure.receipt) {
      return failure.receipt;
    }
    throw failure.error;
  }
  let lastConnectionError: Error | undefined;

  for (const [index, endpoint] of endpoints.entries()) {
    const options: SMTPTransport.Options = {
      host: endpoint.address,
      port: configuration.port,
      secure: configuration.security === "TLS",
      requireTLS: configuration.security === "STARTTLS",
      ignoreTLS: configuration.security === "NONE",
      auth: configuration.username
        ? {
            user: configuration.username,
            pass: password,
          }
        : undefined,
      tls: {
        minVersion: "TLSv1.2",
        servername: endpoint.servername,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      disableFileAccess: true,
      disableUrlAccess: true,
    };
    const transporter = dependencies.createTransport(options);

    try {
      const result = await transporter.sendMail({
        from: {
          address: delivery.from.email,
          name: delivery.from.name ?? "",
        },
        to: delivery.to.map((recipient) => ({
          address: recipient.email,
          name: recipient.name ?? "",
        })),
        replyTo: delivery.replyTo,
        subject: delivery.subject,
        html: delivery.html,
        text: delivery.text,
        headers: {
          ...delivery.headers,
          "X-Shopana-Delivery-Id": delivery.deliveryId,
          "X-Shopana-Idempotency-Key": delivery.idempotencyKey,
        },
      });

      if (result.accepted.length === 0) {
        return {
          state: "REJECTED",
          providerCode: "smtp",
          providerMessageId: result.messageId,
          responseCode: smtpResponseCode(result.response) ?? "SMTP_REJECTED",
        };
      }

      return {
        state: "ACCEPTED",
        providerCode: "smtp",
        providerMessageId: result.messageId,
        acceptedAt: dependencies.now().toISOString(),
        responseCode: smtpResponseCode(result.response),
      };
    } catch (error) {
      const failure = normalizeSmtpError(error);
      if (failure.receipt) {
        return failure.receipt;
      }
      if (index < endpoints.length - 1 && isEndpointConnectionFailure(failure.error)) {
        lastConnectionError = failure.error;
        continue;
      }
      throw failure.error;
    } finally {
      transporter.close();
    }
  }

  throw (
    lastConnectionError ??
    smtpConfigurationError("SMTP_ENDPOINTS_UNAVAILABLE", "No SMTP endpoint is available")
  );
}

export function normalizeSmtpError(
  error: unknown,
):
  | { readonly receipt: NotificationDeliveryReceipt; readonly error?: never }
  | { readonly receipt?: never; readonly error: Error } {
  const smtpError = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const responseCode =
    typeof smtpError.responseCode === "number" ? smtpError.responseCode : undefined;
  const command = typeof smtpError.command === "string" ? smtpError.command : undefined;
  const originalCode = typeof smtpError.code === "string" ? smtpError.code : undefined;
  if (error instanceof Error && smtpError.details && typeof smtpError.details === "object") {
    return { error };
  }

  if (responseCode && responseCode >= 500 && responseCode !== 535) {
    return {
      receipt: {
        state: "REJECTED",
        providerCode: "smtp",
        responseCode: String(responseCode),
      },
    };
  }

  const unknown = command === "DATA" && responseCode === undefined;
  const configuration =
    responseCode === 535 ||
    originalCode === "EAUTH" ||
    originalCode === "ETLS" ||
    originalCode === "ECERT" ||
    originalCode === "ENODATA" ||
    originalCode === "ENOTFOUND" ||
    originalCode === "CERT_HAS_EXPIRED" ||
    originalCode === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
    originalCode === "ERR_TLS_CERT_ALTNAME_INVALID" ||
    originalCode === "SELF_SIGNED_CERT_IN_CHAIN" ||
    originalCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
  const retryable =
    !unknown && !configuration && (responseCode === undefined || responseCode < 500);
  const code = configuration
    ? "SMTP_AUTH_OR_TLS_CONFIGURATION"
    : (originalCode ?? (responseCode ? `SMTP_${responseCode}` : "SMTP_FAILED"));

  return {
    error: Object.assign(new Error("SMTP delivery failed"), {
      code,
      details: Object.freeze({
        kind: unknown ? "UNKNOWN" : configuration ? "CONFIGURATION" : "TEMPORARY",
        safeToRetry: retryable,
        acceptedByProvider: unknown,
        ...(responseCode ? { responseCode } : {}),
        ...(command ? { command } : {}),
      }),
    }),
  };
}

function isEndpointConnectionFailure(error: Error): boolean {
  const value = error as Error & {
    readonly details?: Readonly<Record<string, unknown>>;
  };
  return (
    value.details?.kind === "TEMPORARY" &&
    value.details.acceptedByProvider !== true &&
    value.details.responseCode === undefined
  );
}

function smtpResponseCode(response: string | undefined): string | undefined {
  const match = response?.match(/^\s*(\d{3})(?:\s|$)/);
  return match?.[1];
}
