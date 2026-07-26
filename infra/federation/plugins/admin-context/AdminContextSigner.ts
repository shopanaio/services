import {
  createPrivateKey,
  sign,
  type KeyObject,
} from "node:crypto";
import {
  ADMIN_CONTEXT_AUDIENCE,
  ADMIN_CONTEXT_ISSUER,
  ADMIN_CONTEXT_TOKEN_TYPE,
  type ResolvedAdminAccessContext,
} from "@shopana/shared-context";

export class AdminContextSigner {
  private readonly key: KeyObject;

  constructor(
    private readonly kid: string,
    privateKey: string,
  ) {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(kid) || !privateKey) {
      throw new Error("Admin context signing configuration is required");
    }
    this.key = createPrivateKey(
      privateKey.includes("BEGIN PRIVATE KEY")
        ? privateKey
        : Buffer.from(privateKey, "base64"),
    );
    if (this.key.asymmetricKeyType !== "ed25519") {
      throw new Error(
        "ADMIN_CONTEXT_PRIVATE_KEY must be an Ed25519 private key",
      );
    }
  }

  sign(
    context: ResolvedAdminAccessContext,
    requestId: string,
  ): string {
    const now = Math.floor(Date.now() / 1_000);
    const header = encode({
      alg: "EdDSA",
      kid: this.kid,
      typ: ADMIN_CONTEXT_TOKEN_TYPE,
    });
    const payload = encode({
      iss: ADMIN_CONTEXT_ISSUER,
      aud: ADMIN_CONTEXT_AUDIENCE,
      sub: `user:${context.user.id}`,
      jti: requestId,
      iat: now,
      exp: now + 60,
      tokenUse: "admin_context",
      schemaVersion: 1,
      ...context,
    });
    const input = `${header}.${payload}`;
    const signature = sign(null, Buffer.from(input, "ascii"), this.key);
    const compactJws = `${input}.${signature.toString("base64url")}`;
    if (compactJws.length > 16_384) {
      throw new Error("Admin context is too large");
    }
    return compactJws;
  }
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
