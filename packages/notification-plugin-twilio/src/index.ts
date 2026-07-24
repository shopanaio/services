import { z } from "zod";
import {
  NotificationProviderError,
  type NotificationPlugin,
  type NotificationProvider,
} from "@shopana/plugin-sdk/notifications";

export const configSchema = z.object({
  accountSid: z.string().min(1),
  authToken: z.string().min(1),
  from: z.string().min(1),
  region: z.string().optional(),
}).strict();

type Config = z.infer<typeof configSchema>;

class TwilioProvider implements NotificationProvider {
  constructor(private readonly config: Config) {}

  readonly notifications: NotificationProvider["notifications"] = {
    deliver: async (input) => {
      if (input.channel !== "SMS") {
        throw providerError("VALIDATION", "Twilio only supports SMS", false);
      }

      const response = await this.request("Messages.json", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "idempotency-key": input.idempotencyKey,
        },
        body: new URLSearchParams({
          To: input.to,
          From: input.from ?? this.config.from,
          Body: input.text,
        }),
      });
      const payload = await readJson(response);

      if (response.ok && typeof payload.sid === "string") {
        return {
          state: "ACCEPTED",
          providerCode: "twilio",
          providerMessageId: payload.sid,
          acceptedAt: new Date().toISOString(),
          responseCode: String(response.status),
        };
      }

      throw responseError(response, payload);
    },
    testConnection: async () => {
      const response = await this.request("", { method: "GET" });
      if (!response.ok) {
        throw responseError(response, await readJson(response));
      }
      return { ok: true, providerCode: "twilio" };
    },
    getStatus: async (input) => {
      if (!input.providerMessageId) {
        throw providerError(
          "VALIDATION",
          "Twilio provider message ID is required",
          false
        );
      }
      const response = await this.request(
        `Messages/${encodeURIComponent(input.providerMessageId)}.json`,
        { method: "GET" }
      );
      const payload = await readJson(response);
      if (!response.ok) {
        throw responseError(response, payload);
      }
      const status = String(payload.status ?? "");
      if (["delivered", "read"].includes(status)) {
        return {
          state: "DELIVERED",
          providerCode: "twilio",
          providerMessageId: input.providerMessageId,
          deliveredAt: new Date().toISOString(),
          responseCode: String(response.status),
        };
      }
      if (["failed", "undelivered", "canceled"].includes(status)) {
        return {
          state: "REJECTED",
          providerCode: "twilio",
          providerMessageId: input.providerMessageId,
          responseCode: String(payload.error_code ?? response.status),
        };
      }
      return {
        state: "ACCEPTED",
        providerCode: "twilio",
        providerMessageId: input.providerMessageId,
        responseCode: String(response.status),
      };
    },
  };

  private async request(path: string, init: RequestInit): Promise<Response> {
    const regionSuffix = this.config.region
      ? `.${this.config.region.trim().toLowerCase()}`
      : "";
    const base = `https://api${regionSuffix}.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.config.accountSid)}`;
    try {
      return await fetch(`${base}/${path}`, {
        ...init,
        headers: {
          authorization: `Basic ${Buffer.from(
            `${this.config.accountSid}:${this.config.authToken}`
          ).toString("base64")}`,
          ...init.headers,
        },
      });
    } catch (error) {
      throw new NotificationProviderError({
        kind: "UNKNOWN",
        message:
          error instanceof Error ? error.message : "Twilio request failed",
        safeToRetry: false,
        acceptedByProvider: init.method === "POST",
        providerCode: "twilio",
      });
    }
  }
}

function responseError(
  response: Response,
  payload: Record<string, unknown>
): NotificationProviderError {
  const retryable = response.status === 429 || response.status >= 500;
  return new NotificationProviderError({
    kind:
      response.status === 401
        ? "AUTHENTICATION"
        : response.status === 429
          ? "RATE_LIMIT"
          : retryable
            ? "TEMPORARY"
            : "PERMANENT",
    message:
      typeof payload.message === "string"
        ? payload.message
        : `Twilio returned HTTP ${response.status}`,
    safeToRetry: retryable,
    acceptedByProvider: false,
    providerCode: String(payload.code ?? "twilio"),
    retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds * 1_000 : undefined;
}

function providerError(
  kind: "VALIDATION",
  message: string,
  safeToRetry: boolean
): NotificationProviderError {
  return new NotificationProviderError({ kind, message, safeToRetry });
}

export const plugin: NotificationPlugin<typeof configSchema> = {
  manifest: {
    code: "twilio",
    displayName: "Twilio SMS",
    version: "1.0.0",
    apiVersionRange: "^1.0.0",
    domains: ["notifications"],
    notification: {
      channels: ["SMS"],
      supportsIdempotencyKey: true,
      supportsStatusLookup: true,
      supportsBatch: false,
    },
  },
  configSchema,
  create: (_ctx, config) => new TwilioProvider(config),
};

export default { plugin };
