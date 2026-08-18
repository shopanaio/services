import {
  buildStorefrontContextMiddleware as buildMiddleware,
  type ContextCustomer,
  type ContextStorefrontAccess,
} from "@shopana/shared-context";

declare module "fastify" {
  interface FastifyRequest {
    storefrontAccess?: ContextStorefrontAccess;
    customer: ContextCustomer | null;
    storefrontVisitorId?: string;
  }
}

export function buildStorefrontContextMiddleware() {
  const middleware = buildMiddleware(undefined, {
    serviceName: "CUSTOMERS",
  });
  return async function storefrontContextMiddleware(
    request: Parameters<typeof middleware>[0],
    reply: Parameters<typeof middleware>[1],
  ) {
    if (request.headers["x-interpolation"] === "true") return;
    await middleware(request, reply);
  };
}
