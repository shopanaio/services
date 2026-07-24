import { resolve4, resolve6 } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { z } from "zod";
import {
  NotificationProviderError,
  type NotificationPlugin,
  type NotificationProvider,
} from "@shopana/plugin-sdk/notifications";

export const configSchema = z.object({
  timeoutMs: z.number().int().min(100).max(30_000).default(5_000),
}).strict();

class HttpWebhookProvider implements NotificationProvider {
  constructor(private readonly timeoutMs: number) {}

  readonly notifications: NotificationProvider["notifications"] = {
    deliver: async (input) => {
      if (input.channel !== "WEBHOOK") {
        throw new NotificationProviderError({
          kind: "VALIDATION",
          message: "HTTP webhook provider only supports WEBHOOK",
          safeToRetry: false,
        });
      }

      const target = await resolvePublicHttpsUrl(input.url);

      let response: { status: number; retryAfter?: string };
      try {
        response = await postWebhook({
          ...target,
          timeoutMs: this.timeoutMs,
          headers: {
            ...input.headers,
            "content-type": input.contentType,
            "x-shopana-delivery-id": input.deliveryId,
            "x-shopana-idempotency-key": input.idempotencyKey,
          },
          body: input.body,
        });
      } catch (error) {
        throw new NotificationProviderError({
          kind: "UNKNOWN",
          message:
            error instanceof Error ? error.message : "Webhook request failed",
          safeToRetry: false,
          acceptedByProvider: true,
          providerCode: "http_webhook",
        });
      }

      if (response.status >= 200 && response.status < 300) {
        return {
          state: "DELIVERED",
          providerCode: "http_webhook",
          deliveredAt: new Date().toISOString(),
          responseCode: String(response.status),
        };
      }

      const retryable = response.status === 429 || response.status >= 500;
      throw new NotificationProviderError({
        kind:
          response.status === 429
            ? "RATE_LIMIT"
            : retryable
              ? "TEMPORARY"
              : "PERMANENT",
        message: `Webhook returned HTTP ${response.status}`,
        safeToRetry: retryable,
        acceptedByProvider: false,
        providerCode: "http_webhook",
        retryAfterMs: parseRetryAfter(response.retryAfter),
      });
    },
    testConnection: async () => ({
      ok: true,
      providerCode: "http_webhook",
      message: "Configuration is valid; no endpoint was called",
    }),
  };
}

async function resolvePublicHttpsUrl(
  value: string
): Promise<{ url: URL; address: string }> {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw invalidUrl(
      "Webhook URL must be absolute HTTPS and must not contain credentials"
    );
  }
  if (url.port && url.port !== "443") {
    throw invalidUrl("Webhook URL port is not allowed");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isForbiddenHostname(hostname)) {
    throw invalidUrl("Webhook URL uses a forbidden host");
  }

  const addresses = isIP(hostname)
    ? [hostname]
    : (
        await Promise.all([
          resolve4(hostname).catch(() => []),
          resolve6(hostname).catch(() => []),
        ])
      ).flat();

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw invalidUrl("Webhook URL resolves to a forbidden network");
  }
  return { url, address: addresses[0]! };
}

function invalidUrl(message: string): NotificationProviderError {
  return new NotificationProviderError({
    kind: "VALIDATION",
    message,
    safeToRetry: false,
  });
}

function isForbiddenHostname(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal"
  );
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateAddress(mappedIpv4);
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    /^0\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^127\./.test(normalized) ||
    /^169\.254\./.test(normalized) ||
    /^192\.0\.0\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) ||
    /^224\./.test(normalized) ||
    /^240\./.test(normalized)
  );
}

function postWebhook(input: {
  url: URL;
  address: string;
  timeoutMs: number;
  headers: Record<string, string>;
  body: string;
}): Promise<{ status: number; retryAfter?: string }> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname: input.address,
        family: isIP(input.address),
        port: 443,
        method: "POST",
        path: `${input.url.pathname}${input.url.search}`,
        servername: input.url.hostname.replace(/^\[|\]$/g, ""),
        headers: {
          ...input.headers,
          host: input.url.host,
          "content-length": String(Buffer.byteLength(input.body)),
        },
      },
      (response) => {
        const retryAfter = response.headers["retry-after"];
        resolve({
          status: response.statusCode ?? 0,
          retryAfter: Array.isArray(retryAfter)
            ? retryAfter[0]
            : retryAfter,
        });
        response.destroy();
      }
    );
    request.setTimeout(input.timeoutMs, () => {
      request.destroy(new Error("Webhook request timed out"));
    });
    request.once("error", reject);
    request.end(input.body);
  });
}

function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds * 1_000 : undefined;
}

export const plugin: NotificationPlugin<typeof configSchema> = {
  manifest: {
    code: "http_webhook",
    displayName: "HTTP Webhook",
    version: "1.0.0",
    apiVersionRange: "^1.0.0",
    domains: ["notifications"],
    notification: {
      channels: ["WEBHOOK"],
      supportsIdempotencyKey: true,
      supportsBatch: false,
    },
  },
  configSchema,
  create: (_ctx, config) => new HttpWebhookProvider(config.timeoutMs),
};

export default { plugin };
