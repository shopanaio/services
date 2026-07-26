import {
  createPrivateKey,
  sign,
  type KeyObject,
} from "node:crypto";
import type { ResolvedStorefrontAccessContext } from "./types.js";

export class StorefrontContextSigner {
  private readonly key: KeyObject;

  constructor(
    private readonly kid: string,
    privateKey: string,
  ) {
    if (!kid || !privateKey) {
      throw new Error("Storefront context signing configuration is required");
    }
    this.key = createPrivateKey(
      privateKey.includes("BEGIN PRIVATE KEY")
        ? privateKey
        : Buffer.from(privateKey, "base64"),
    );
  }

  sign(
    context: ResolvedStorefrontAccessContext,
    requestId: string,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: "EdDSA", kid: this.kid, typ: "JWT" });
    const payload = encode({
      iss: "shopana-storefront-gateway",
      aud: "shopana-storefront-subgraphs",
      sub: `credential:${context.access.credentialId}`,
      jti: requestId,
      iat: now,
      exp: now + 60,
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
    });
    const input = `${header}.${payload}`;
    const signature = sign(null, Buffer.from(input, "ascii"), this.key);
    return `${input}.${signature.toString("base64url")}`;
  }
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
