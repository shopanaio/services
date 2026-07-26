import type {
  GatewayConfig,
  GatewayPlugin,
} from "@graphql-hive/gateway";
import { randomUUID } from "node:crypto";
import { GraphQLError } from "graphql";
import { createWebSocketRequest } from "../WebSocketRequest.js";
import { StorefrontAccessClient } from "./StorefrontAccessClient.js";
import { StorefrontContextSigner } from "./StorefrontContextSigner.js";
import {
  parseRequestId,
  parseStorefrontRequest,
  requestError,
  STOREFRONT_REQUEST_ID_HEADER,
} from "./StorefrontRequestHeaders.js";

type RequestIdConfig = Exclude<
  GatewayConfig["requestId"],
  boolean | undefined
>;

// Network-derived headers such as x-forwarded-for must not be read from
// client-controlled WebSocket connectionParams.
const STOREFRONT_WEBSOCKET_HEADERS = new Set([
  "authorization",
  "shopana-storefront-buyer-ip",
  "shopana-storefront-private-token",
  "traceparent",
  "tracestate",
  "user-agent",
  STOREFRONT_REQUEST_ID_HEADER,
  "x-shopana-storefront-access-token",
]);

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
  const generatedRequestIds = new WeakMap<Request, string>();
  const contexts = new WeakMap<Request, string>();
  const requestId: RequestIdConfig = {
    headerName: STOREFRONT_REQUEST_ID_HEADER,
    generateRequestId({ request, fetchAPI }) {
      const value = fetchAPI.crypto.randomUUID();
      generatedRequestIds.set(request, value);
      return value;
    },
  };
  const plugin: GatewayPlugin = {
    async onRequest({ request, fetchAPI, endResponse }) {
      if (new URL(request.url).pathname === "/health") return;
      try {
        contexts.set(
          request,
          await resolveRequest(request, generatedRequestIds.get(request)),
        );
      } catch (error) {
        const known = error as {
          status?: number;
          code?: string;
        };
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
    async onContextBuilding({ context, extendContext }) {
      if (context.request) return;

      try {
        const request = createWebSocketRequest(
          context.connectionParams,
          STOREFRONT_WEBSOCKET_HEADERS,
        );
        const requestId = parseRequestId(request) ?? randomUUID();
        request.headers.set(STOREFRONT_REQUEST_ID_HEADER, requestId);
        contexts.set(request, await resolveRequest(request, requestId));
        extendContext({ request });
      } catch (error) {
        throw websocketError(error, "STOREFRONT_ACCESS_UNAVAILABLE");
      }
    },
  };

  async function resolveRequest(
    request: Request,
    fallbackRequestId: string | undefined,
  ): Promise<string> {
    const parsed = parseStorefrontRequest(request);
    const requestId = parseRequestId(request) ?? fallbackRequestId;
    if (!requestId) {
      throw new Error("Gateway request ID is unavailable");
    }
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
    return signer.sign(context, requestId);
  }

  return {
    plugin,
    requestId,
    contextFor(request: Request): string | undefined {
      return contexts.get(request);
    },
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function websocketError(error: unknown, fallbackCode: string): GraphQLError {
  const known = error as { code?: string };
  const code = known.code ?? fallbackCode;
  return new GraphQLError(code, { extensions: { code } });
}
