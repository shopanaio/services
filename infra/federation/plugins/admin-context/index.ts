import type {
  GatewayConfig,
  GatewayPlugin,
} from "@graphql-hive/gateway";
import { randomUUID } from "node:crypto";
import { GraphQLError } from "graphql";
import { createWebSocketRequest } from "../WebSocketRequest.js";
import { AdminContextClient } from "./AdminContextClient.js";
import { AdminContextSigner } from "./AdminContextSigner.js";
import {
  ADMIN_REQUEST_ID_HEADER,
  parseAdminRequest,
  parseAdminRequestId,
  requestError,
} from "./AdminRequestHeaders.js";

type RequestIdConfig = Exclude<
  GatewayConfig["requestId"],
  boolean | undefined
>;

const ADMIN_WEBSOCKET_HEADERS = new Set([
  "authorization",
  "traceparent",
  "tracestate",
  "user-agent",
  ADMIN_REQUEST_ID_HEADER,
  "x-store-name",
  "x-organization-id",
]);

export function createAdminContextPlugin() {
  const client = new AdminContextClient(
    required("ADMIN_CONTEXT_RESOLVER_URL"),
    required("ADMIN_CONTEXT_RESOLVER_INTERNAL_TOKEN"),
    Number(process.env.ADMIN_CONTEXT_RESOLVE_TIMEOUT_MS ?? 1_000),
  );
  const signer = new AdminContextSigner(
    required("ADMIN_CONTEXT_ACTIVE_KID"),
    required("ADMIN_CONTEXT_PRIVATE_KEY"),
  );
  const generatedRequestIds = new WeakMap<Request, string>();
  const contexts = new WeakMap<Request, string>();
  const requestId: RequestIdConfig = {
    headerName: ADMIN_REQUEST_ID_HEADER,
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
        const signedContext = await resolveRequest(
          request,
          generatedRequestIds.get(request),
          false,
        );
        if (signedContext) contexts.set(request, signedContext);
      } catch (error) {
        const known = error as {
          status?: number;
          code?: string;
        };
        const status = known.status ?? 503;
        const code = known.code ?? "ADMIN_CONTEXT_UNAVAILABLE";
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
          ADMIN_WEBSOCKET_HEADERS,
        );
        const requestId = parseAdminRequestId(request) ?? randomUUID();
        request.headers.set(ADMIN_REQUEST_ID_HEADER, requestId);
        const signedContext = await resolveRequest(request, requestId, true);
        if (!signedContext) {
          throw new Error("Admin WebSocket context is unavailable");
        }
        contexts.set(request, signedContext);
        extendContext({ request });
      } catch (error) {
        throw websocketError(error, "ADMIN_CONTEXT_UNAVAILABLE");
      }
    },
  };

  async function resolveRequest(
    request: Request,
    fallbackRequestId: string | undefined,
    requireAccessToken: boolean,
  ): Promise<string | undefined> {
    const parsed = parseAdminRequest(request);
    if (!parsed.accessToken) {
      if (!requireAccessToken) return undefined;
      throw requestError(
        401,
        "ADMIN_ACCESS_TOKEN_REQUIRED",
        "An admin access token is required",
      );
    }
    const requestId = parseAdminRequestId(request) ?? fallbackRequestId;
    if (!requestId) {
      throw new Error("Gateway request ID is unavailable");
    }
    const context = await client.resolve({
      accessToken: parsed.accessToken,
      ...(parsed.organizationId
        ? { organizationId: parsed.organizationId }
        : {}),
      ...(parsed.storeName ? { storeName: parsed.storeName } : {}),
      requestId,
    });
    if (!context) {
      throw requestError(
        401,
        "ADMIN_CONTEXT_INVALID",
        "Invalid admin access context",
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
