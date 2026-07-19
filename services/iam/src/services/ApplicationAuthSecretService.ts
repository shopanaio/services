import { hkdfSync } from "node:crypto";
import { ApplicationAuthKeyring } from "./ApplicationAuthKeyring.js";

/** Stable per-realm Better Auth secret derived without database key material. */
export class ApplicationAuthSecretService {
  constructor(private readonly keyring: ApplicationAuthKeyring) {}

  deriveRealmSecret(applicationId: string, keyVersion: number): string {
    const context = `shopana:iam:application-auth:${applicationId}:${keyVersion}`;
    return this.keyring.withRootKey(keyVersion, (rootKey) =>
      Buffer.from(
        hkdfSync(
          "sha256",
          rootKey,
          Buffer.alloc(0),
          Buffer.from(context, "utf8"),
          32
        )
      ).toString("base64url")
    );
  }

  derivePurposeSecret(
    applicationId: string,
    keyVersion: number,
    purpose: "authorization-context" | "rate-limit" | "hosted-ui-logout"
  ): string {
    const context =
      `shopana:iam:application-auth:${purpose}:${applicationId}:${keyVersion}`;
    return this.keyring.withRootKey(keyVersion, (rootKey) =>
      Buffer.from(
        hkdfSync(
          "sha256",
          rootKey,
          Buffer.alloc(0),
          Buffer.from(context, "utf8"),
          32
        )
      ).toString("base64url")
    );
  }
}
