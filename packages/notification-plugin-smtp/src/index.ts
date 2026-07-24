import nodemailer from "nodemailer";
import { z } from "zod";
import {
  NotificationProviderError,
  type NotificationPlugin,
  type NotificationProvider,
} from "@shopana/plugin-sdk/notifications";

export const configSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65_535),
  secure: z.boolean().default(false),
  username: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email(),
  fromName: z.string().optional(),
}).strict();

type Config = z.infer<typeof configSchema>;

class SmtpProvider implements NotificationProvider {
  private readonly transport;

  constructor(private readonly config: Config) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.username && config.password
          ? { user: config.username, pass: config.password }
          : undefined,
      pool: true,
    });
  }

  readonly notifications: NotificationProvider["notifications"] = {
    deliver: async (input) => {
      if (input.channel !== "EMAIL") {
        throw new NotificationProviderError({
          kind: "VALIDATION",
          message: "SMTP provider only supports EMAIL",
          safeToRetry: false,
        });
      }

      try {
        const receipt = (await this.transport.sendMail({
          from: input.from
            ? {
                address: input.from.email,
                name: input.from.name ?? "",
              }
            : {
                address: this.config.fromEmail,
                name: this.config.fromName ?? "",
              },
          to: input.to.map((recipient) => ({
            address: recipient.email,
            name: recipient.name ?? "",
          })),
          replyTo: input.replyTo,
          subject: input.subject,
          html: input.html,
          text: input.text,
          headers: {
            ...input.headers,
            "X-Shopana-Delivery-ID": input.deliveryId,
            "X-Shopana-Idempotency-Key": input.idempotencyKey,
          },
        })) as unknown as { messageId: string; response: string };

        return {
          state: "ACCEPTED",
          providerCode: "smtp",
          providerMessageId: receipt.messageId,
          acceptedAt: new Date().toISOString(),
          responseCode: receipt.response,
        };
      } catch (error) {
        const code = getCode(error);
        const authentication = code === "EAUTH";
        const validation = code === "EENVELOPE";
        const ambiguous = ["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(code);
        throw new NotificationProviderError({
          kind: authentication
            ? "AUTHENTICATION"
            : validation
              ? "VALIDATION"
              : ambiguous
                ? "UNKNOWN"
                : "PERMANENT",
          message:
            error instanceof Error ? error.message : "SMTP delivery failed",
          safeToRetry: false,
          acceptedByProvider: ambiguous,
          providerCode: code || "smtp",
        });
      }
    },
    testConnection: async () => {
      try {
        await this.transport.verify();
        return { ok: true, providerCode: "smtp" };
      } catch (error) {
        throw new NotificationProviderError({
          kind: getCode(error) === "EAUTH" ? "AUTHENTICATION" : "CONFIGURATION",
          message:
            error instanceof Error
              ? error.message
              : "SMTP connection test failed",
          safeToRetry: false,
          providerCode: getCode(error) || "smtp",
        });
      }
    },
  };
}

export const plugin: NotificationPlugin<typeof configSchema> = {
  manifest: {
    code: "smtp",
    displayName: "SMTP",
    version: "1.0.0",
    apiVersionRange: "^1.0.0",
    domains: ["notifications"],
    notification: {
      channels: ["EMAIL"],
      supportsIdempotencyKey: false,
      supportsBatch: false,
    },
  },
  configSchema,
  create: (_ctx, config) => new SmtpProvider(config),
};

function getCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }
  return String(error.code);
}

export default { plugin };
