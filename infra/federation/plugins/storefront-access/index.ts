import type { GatewayConfig, GatewayPlugin } from "@graphql-hive/gateway";
import { createHash, randomUUID } from "node:crypto";
import { GraphQLError } from "graphql";
import { createWebSocketRequest } from "../WebSocketRequest.js";
import { StorefrontAccessClient } from "./StorefrontAccessClient.js";
import { StorefrontCustomerContextClient } from "./StorefrontCustomerContextClient.js";
import { StorefrontContextSigner } from "./StorefrontContextSigner.js";
import {
  parseRequestId,
  parseStorefrontRequest,
  requestError,
  STOREFRONT_REQUEST_ID_HEADER,
} from "./StorefrontRequestHeaders.js";

type RequestIdConfig = Exclude<GatewayConfig["requestId"], boolean | undefined>;

// Network-derived headers such as x-forwarded-for must not be read from
// client-controlled WebSocket connectionParams.
const STOREFRONT_WEBSOCKET_HEADERS = new Set([
  "authorization",
  "shopana-storefront-buyer-ip",
  "shopana-storefront-private-token",
  "x-shopana-storefront-visitor-id",
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
  const customerClient = new StorefrontCustomerContextClient(
    required("STOREFRONT_CUSTOMER_CONTEXT_RESOLVER_URL"),
    required("STOREFRONT_RESOLVER_INTERNAL_TOKEN"),
    Number(process.env.STOREFRONT_CUSTOMER_CONTEXT_RESOLVE_TIMEOUT_MS ?? 1_000),
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
        contexts.set(request, await resolveRequest(request, generatedRequestIds.get(request)));
      } catch (error) {
        const known = error as {
          code?: string;
        };
        const code = known.code ?? "STOREFRONT_ACCESS_UNAVAILABLE";
        endResponse(
          new fetchAPI.Response(
            JSON.stringify({
              data: null,
              errors: [{ message: code, extensions: { code } }],
            }),
            {
              // Authentication and resolver failures are represented by the
              // GraphQL error envelope. Keep the HTTP transport successful so
              // GraphQL clients can inspect the stable error code.
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
        );
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
      throw requestError(401, "STOREFRONT_CREDENTIAL_INVALID", "Invalid storefront credential");
    }
    const customerToken = parseCustomerAccessToken(request);
    if (!customerToken) {
      return signer.sign(
        context,
        requestId,
        storefrontVisitorId(request, context.access.credentialId, context.store.id, parsed.buyerIp),
        null,
      );
    }
    const customerContext = await customerClient.resolve({
      accessToken: customerToken,
      storeId: context.store.id,
      organizationId: context.store.organizationId,
      requestId,
    });
    if (!customerContext) {
      throw requestError(
        401,
        "STOREFRONT_CUSTOMER_INVALID",
        "Invalid storefront customer credential",
      );
    }
    return signer.sign(
      context,
      requestId,
      storefrontVisitorId(request, context.access.credentialId, context.store.id, parsed.buyerIp),
      customerContext.customer,
      customerContext.cacheUntil,
    );
  }

  return {
    plugin,
    requestId,
    contextFor(request: Request): string | undefined {
      return contexts.get(request);
    },
  };
}

function storefrontVisitorId(
  request: Request,
  credentialId: string,
  storeId: string,
  buyerIp: string | undefined,
): string {
  const clientVisitorId = request.headers.get("x-shopana-storefront-visitor-id")?.trim();
  if (clientVisitorId && !/^[A-Za-z0-9._~-]{16,128}$/.test(clientVisitorId)) {
    throw requestError(400, "STOREFRONT_VISITOR_ID_INVALID", "Invalid storefront visitor ID");
  }
  const identity = clientVisitorId
    ? `client:${clientVisitorId}`
    : `network:${buyerIp ?? "unknown"}:${request.headers.get("user-agent")?.slice(0, 256) ?? "unknown"}`;
  return createHash("sha256").update(`${storeId}:${credentialId}:${identity}`).digest("base64url");
}

function parseCustomerAccessToken(request: Request): string | undefined {
  const value = request.headers.get("authorization")?.trim();
  if (!value) return undefined;
  if (value.includes(",") || !value.startsWith("Bearer ") || value.length > 16_391) {
    throw requestError(
      401,
      "STOREFRONT_CUSTOMER_INVALID",
      "Invalid storefront customer credential",
    );
  }
  const token = value.slice(7).trim();
  if (!token) {
    throw requestError(
      401,
      "STOREFRONT_CUSTOMER_INVALID",
      "Invalid storefront customer credential",
    );
  }
  return token;
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
