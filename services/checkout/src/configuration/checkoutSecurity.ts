import { getServiceConfig } from "@shopana/shared-service-config";
import { z } from "zod";

const configurationSchema = z
  .object({
    allowed_return_origins: z.array(z.string().url()).max(100).default([]),
    allowed_deep_link_schemes: z
      .array(z.string().regex(/^[a-z][a-z0-9+.-]*$/))
      .max(50)
      .default([]),
  })
  .strict();

export function assertAllowedCheckoutReturnUrl(value: string): void {
  const { service } = getServiceConfig("checkout");
  const configuration = configurationSchema.parse(service.security ?? {});
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PLACE_ORDER_RETURN_URL_INVALID");
  }
  if (url.username || url.password || value.length > 2_048) {
    throw new Error("PLACE_ORDER_RETURN_URL_INVALID");
  }
  if (url.protocol === "https:") {
    const allowedOrigins = new Set(
      configuration.allowed_return_origins.map((origin) => new URL(origin).origin),
    );
    if (!allowedOrigins.has(url.origin)) {
      throw new Error("PLACE_ORDER_RETURN_URL_NOT_ALLOWED");
    }
    return;
  }
  const scheme = url.protocol.slice(0, -1).toLowerCase();
  if (!configuration.allowed_deep_link_schemes.includes(scheme)) {
    throw new Error("PLACE_ORDER_RETURN_URL_NOT_ALLOWED");
  }
}
