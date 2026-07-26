import { randomUUID } from "node:crypto";
import type { GatewayPlugin } from "@graphql-hive/gateway";
import { StorefrontAccessClient } from "./StorefrontAccessClient.js";
import { StorefrontContextSigner } from "./StorefrontContextSigner.js";
import { StorefrontAccessRateLimiter } from "./StorefrontAccessRateLimiter.js";
import {
  parseStorefrontRequest,
  requestError,
} from "./StorefrontRequestHeaders.js";

export function createStorefrontAccessPlugin() {
  const client = new StorefrontAccessClient(
    required("STOREFRONT_ACCESS_RESOLVER_URL"),
    required("STOREFRONT_RESOLVER_INTERNAL_TOKEN"),
    Number(process.env.STOREFRONT_ACCESS_RESOLVE_TIMEOUT_MS ?? 1_000),
  );
  const signer = new StorefrontContextSigner(
    required("STOREFRONT_CONTEXT_ACTIVE_KID"),
    required("STOREFRONT_CONTEXT_PRIVATE_KEY"),
  );
  const signedContexts = new WeakMap<Request, string>();
  const rateLimiter = new StorefrontAccessRateLimiter();
  const plugin: GatewayPlugin = {
    async onRequest({ request, fetchAPI, endResponse }) {
      if (new URL(request.url).pathname === "/health") return;
      try {
        const parsed = parseStorefrontRequest(request);
        const requestId = request.headers.get("x-request-id") ?? randomUUID();
        const context = await client.resolve({
          token: parsed.token,
          accessMode: parsed.mode,
          buyerIp: parsed.buyerIp,
          requestId,
        });
        if (!context) {
          throw requestError(
            401,
            "STOREFRONT_CREDENTIAL_INVALID",
            "Invalid storefront credential",
          );
        }
        if (!rateLimiter.consume(context, parsed.buyerIp)) {
          throw requestError(
            429,
            "STOREFRONT_RATE_LIMITED",
            "Storefront request rate limit exceeded",
          );
        }
        signedContexts.set(request, signer.sign(context, requestId));
      } catch (error) {
        const known = error as { status?: number; code?: string };
        const status = known.status ?? 503;
        const code = known.code ?? "STOREFRONT_ACCESS_UNAVAILABLE";
        endResponse(new fetchAPI.Response(JSON.stringify({
          data: null,
          errors: [{ message: code, extensions: { code } }],
        }), {
          status,
          headers: { "content-type": "application/json" },
        }));
      }
    },
  };
  return {
    plugin,
    contextFor(request: Request): string | undefined {
      return signedContexts.get(request);
    },
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
