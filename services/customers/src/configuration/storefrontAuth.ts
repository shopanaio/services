import { getServiceConfig } from "@shopana/shared-service-config";
import { z } from "zod";

const configurationSchema = z
  .object({
    origin_template: z.string().min(1),
    callback_path: z.string().startsWith("/").default("/auth/callback"),
    post_logout_path: z.string().startsWith("/").default("/"),
  })
  .strict();

export interface StorefrontAuthUrls {
  origin: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
}

export function resolveStorefrontAuthUrls(storeName: string): StorefrontAuthUrls {
  const { service, global } = getServiceConfig("customers");
  const configuration = configurationSchema.parse(service.storefront_auth);
  const renderedOrigin = configuration.origin_template.replaceAll(
    "{store}",
    storeName,
  );
  const originUrl = new URL(renderedOrigin);
  if (
    originUrl.username ||
    originUrl.password ||
    originUrl.search ||
    originUrl.hash ||
    (originUrl.pathname !== "" && originUrl.pathname !== "/")
  ) {
    throw new Error(
      "Customers storefront_auth.origin_template must resolve to an origin",
    );
  }
  if (global.environment === "production" && originUrl.protocol !== "https:") {
    throw new Error("Production storefront auth origin must use HTTPS");
  }
  if (originUrl.protocol !== "https:" && originUrl.protocol !== "http:") {
    throw new Error("Storefront auth origin must use HTTP or HTTPS");
  }

  const origin = originUrl.origin;
  return {
    origin,
    redirectUri: new URL(configuration.callback_path, `${origin}/`).href,
    postLogoutRedirectUri: new URL(
      configuration.post_logout_path,
      `${origin}/`,
    ).href,
  };
}
