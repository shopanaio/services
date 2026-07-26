import {
  createPrivateKey,
  sign,
  type KeyObject,
} from "node:crypto";
import {
  STOREFRONT_CONTEXT_AUDIENCE,
  STOREFRONT_CONTEXT_ISSUER,
  type ContextCustomer,
  type ResolvedStorefrontAccessContext,
} from "@shopana/shared-context";

export class StorefrontContextSigner {
  private readonly key: KeyObject;

  constructor(
    private readonly kid: string,
    privateKey: string,
  ) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(kid) || !privateKey) {
      throw new Error("Storefront context signing configuration is required");
    }
    this.key = createPrivateKey(
      privateKey.includes("BEGIN PRIVATE KEY")
        ? privateKey
        : Buffer.from(privateKey, "base64"),
    );
    if (this.key.asymmetricKeyType !== "ed25519") {
      throw new Error(
        "STOREFRONT_CONTEXT_PRIVATE_KEY must be an Ed25519 private key",
      );
    }
  }

  sign(
    context: ResolvedStorefrontAccessContext,
    requestId: string,
    customer: ContextCustomer | null,
    customerCacheUntil?: Date,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = customerCacheUntil
      ? Math.min(now + 60, Math.floor(customerCacheUntil.getTime() / 1_000))
      : now + 60;
    if (expiresAt <= now) {
      throw new Error("Storefront customer context has expired");
    }
    const header = encode({ alg: "EdDSA", kid: this.kid, typ: "JWT" });
    const payload = encode({
      iss: STOREFRONT_CONTEXT_ISSUER,
      aud: STOREFRONT_CONTEXT_AUDIENCE,
      sub: `credential:${context.access.credentialId}`,
      jti: requestId,
      iat: now,
      exp: expiresAt,
      organizationId: context.store.organizationId,
      store: context.store,
      storefront: {
        connectionId: context.access.connectionId,
        installationId: context.access.installationId,
        credentialId: context.access.credentialId,
        accessMode: context.access.mode,
        permissions: context.access.permissions,
        policyRevision: context.access.policyRevision,
      },
      customer,
    });
    const input = `${header}.${payload}`;
    const signature = sign(null, Buffer.from(input, "ascii"), this.key);
    const compactJws = `${input}.${signature.toString("base64url")}`;
    if (compactJws.length > 16_384) {
      throw new Error("Storefront context is too large");
    }
    return compactJws;
  }
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
