import { buildStorefrontContextMiddleware as buildMiddleware } from "@shopana/shared-context";

export function buildStorefrontContextMiddleware() {
  const middleware = buildMiddleware(undefined, {
    serviceName: "CATALOG",
  });

  return async function storefrontContextMiddleware(
    request: Parameters<typeof middleware>[0],
    reply: Parameters<typeof middleware>[1],
  ) {
    if (request.headers["x-interpolation"] === "true") return;
    await middleware(request, reply);
  };
}
