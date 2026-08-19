import { createHmac } from "node:crypto";
import type { CdnAdapterContext } from "../CdnAdapterRegistry.js";
import type { SecretProvider } from "../../secrets/SecretProvider.js";

const DEFAULT_TTL_SECONDS = 300;

export function createHmacSigningAdapter(secrets: SecretProvider) {
  return async (context: CdnAdapterContext): Promise<string> => {
    const secretRef = context.configuration.secretRef;
    if (!secretRef) throw new Error("secretRef is required for hmac signing");
    const secret = await secrets.resolve(secretRef);

    const url = new URL(context.url);
    const expires = Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS;
    const payload = `${url.pathname}${url.search}:${expires}`;
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    url.searchParams.set("expires", String(expires));
    url.searchParams.set("signature", signature);
    return url.toString();
  };
}
