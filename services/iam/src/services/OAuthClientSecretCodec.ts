import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Compatibility boundary for @better-auth/oauth-provider@1.6.23.
 *
 * With `storeClientSecret: "hashed"`, the plugin stores an unpadded
 * base64url-encoded SHA-256 digest of the plaintext secret. Keeping that
 * contract local prevents a package upgrade from silently changing persisted
 * client authentication data.
 */
export class OAuthClientSecretCodec {
  static readonly oauthProviderVersion = "1.6.23";
  static readonly randomByteLength = 32;

  generateClientId(): string {
    return randomBytes(OAuthClientSecretCodec.randomByteLength).toString("base64url");
  }

  generateSecret(): string {
    return randomBytes(OAuthClientSecretCodec.randomByteLength).toString("base64url");
  }

  hash(secret: string): string {
    if (!secret) {
      throw new Error("OAuth client secret must not be empty");
    }
    return createHash("sha256").update(secret, "utf8").digest("base64url");
  }

  verify(secret: string, storedHash: string): boolean {
    if (!secret || !storedHash) return false;
    const actual = Buffer.from(this.hash(secret), "utf8");
    const expected = Buffer.from(storedHash, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
