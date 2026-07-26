import type {
  GatewayConfig,
  GatewayPlugin,
} from "@graphql-hive/gateway";
import { AdminContextClient } from "./AdminContextClient.js";
import { AdminContextSigner } from "./AdminContextSigner.js";
import {
  ADMIN_REQUEST_ID_HEADER,
  parseAdminRequest,
  parseAdminRequestId,
} from "./AdminRequestHeaders.js";

type RequestIdConfig = Exclude<
  GatewayConfig["requestId"],
  boolean | undefined
>;

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
        const parsed = parseAdminRequest(request);
        if (!parsed.accessToken) return;
        const requestId =
          parseAdminRequestId(request) ?? generatedRequestIds.get(request);
        if (!requestId) {
          throw new Error("Gateway request ID is unavailable");
        }
        const context = await client.resolve({
          accessToken: parsed.accessToken,
          ...(parsed.storeName ? { storeName: parsed.storeName } : {}),
          requestId,
        });
        if (!context) {
          throw Object.assign(new Error("Invalid admin access context"), {
            status: 401,
            code: "ADMIN_CONTEXT_INVALID",
          });
        }
        contexts.set(request, signer.sign(context, requestId));
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
  };
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
