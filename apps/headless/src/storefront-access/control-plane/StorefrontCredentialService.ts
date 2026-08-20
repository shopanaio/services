import type {
  HeadlessStorefrontRepository,
  HeadlessStorefrontScope,
  StorefrontCredentialRecord,
} from "../repositories/index.js";
import { StorefrontCredentialCrypto } from "./StorefrontCredentialCrypto.js";

export class StorefrontCredentialService {
  constructor(
    private readonly repository: HeadlessStorefrontRepository,
    readonly crypto: StorefrontCredentialCrypto,
  ) {}

  async createInitialCredentials(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    actor: { readonly type: string; readonly id?: string },
  ) {
    const existing = await this.repository.credential.findActivePublicByConnection(
      scope,
      connectionId,
    );
    if (existing) throw new Error("STOREFRONT_PUBLIC_CREDENTIAL_EXISTS");
    const publicGenerated = this.crypto.generate("PUBLIC");
    const privateGenerated = this.crypto.generate("PRIVATE");

    const publicCredential = await this.create(
      scope,
      connectionId,
      publicGenerated,
      "PUBLIC",
      actor,
      "Public access token",
    );
    const encrypted = this.crypto.encryptPublicToken(publicGenerated.token, {
      storeId: scope.storeId,
      connectionId,
      credentialId: publicCredential.id,
    });
    const persistedPublic = await this.repository.credential.setPublicTokenCiphertext(
      scope,
      publicCredential.id,
      encrypted,
    );
    if (!persistedPublic) throw new Error("STOREFRONT_CREDENTIAL_CREATE_FAILED");

    const privateCredential = await this.create(
      scope,
      connectionId,
      privateGenerated,
      "PRIVATE",
      actor,
      "Initial private access token",
    );
    return Object.freeze({
      publicAccessToken: publicGenerated.token,
      privateAccessToken: privateGenerated.token,
      publicCredential: persistedPublic,
      privateCredential,
    });
  }

  async createPrivateCredential(
    scope: HeadlessStorefrontScope,
    input: {
      readonly connectionId: string;
      readonly label: string;
      readonly clientMutationId: string;
      readonly actor: { readonly type: string; readonly id?: string };
    },
  ) {
    const label = input.label.trim();
    if (!label || label.length > 255) {
      throw new Error("STOREFRONT_CREDENTIAL_LABEL_INVALID");
    }
    return this.repository.runInTransaction(async () => {
      const existingId = await this.repository.idempotency.lockAndFind(
        scope,
        "PRIVATE_CREDENTIAL_CREATE",
        input.clientMutationId,
      );
      if (existingId) {
        const credential = await this.repository.credential.findById(scope, existingId);
        if (!credential) throw new Error("STOREFRONT_CREDENTIAL_NOT_FOUND");
        return Object.freeze({
          credential,
          privateAccessToken: null,
        });
      }
      const connection = await this.repository.connection.lockById(scope, input.connectionId);
      if (!connection) {
        throw new Error("STOREFRONT_CREDENTIAL_NOT_FOUND");
      }
      if (connection.status !== "ACTIVE") {
        throw new Error("STOREFRONT_INVALID_STATE");
      }
      const generated = this.crypto.generate("PRIVATE");
      const credential = await this.create(
        scope,
        input.connectionId,
        generated,
        "PRIVATE",
        input.actor,
        label,
      );
      await this.repository.idempotency.record(
        scope,
        "PRIVATE_CREDENTIAL_CREATE",
        input.clientMutationId,
        credential.id,
      );
      return Object.freeze({
        credential,
        privateAccessToken: generated.token,
      });
    });
  }

  async getPublicAccessToken(
    scope: HeadlessStorefrontScope,
    connectionId: string,
  ): Promise<string | null> {
    const credential = await this.repository.credential.findActivePublicByConnection(
      scope,
      connectionId,
    );
    if (!credential?.publicTokenCiphertext) return null;
    return this.crypto.decryptPublicToken(credential.publicTokenCiphertext, {
      storeId: scope.storeId,
      connectionId,
      credentialId: credential.id,
    });
  }

  async revokePrivate(
    scope: HeadlessStorefrontScope,
    input: {
      readonly credentialId: string;
      readonly actor: { readonly type: string; readonly id?: string };
    },
  ): Promise<StorefrontCredentialRecord> {
    const current = await this.repository.credential.findById(scope, input.credentialId);
    if (!current || current.kind !== "PRIVATE") {
      throw new Error("STOREFRONT_CREDENTIAL_NOT_FOUND");
    }
    if (current.status === "REVOKED") return current;
    const revoked = await this.repository.credential.revokePrivate(scope, {
      credentialId: input.credentialId,
      revokedByType: input.actor.type,
      revokedById: input.actor.id,
    });
    if (!revoked) throw new Error("STOREFRONT_CREDENTIAL_NOT_FOUND");
    return revoked;
  }

  private async create(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    generated: ReturnType<StorefrontCredentialCrypto["generate"]>,
    kind: "PUBLIC" | "PRIVATE",
    actor: { readonly type: string; readonly id?: string },
    label: string,
  ): Promise<StorefrontCredentialRecord> {
    const credential = await this.repository.credential.create(scope, {
      connectionId,
      kind,
      kid: generated.kid,
      tokenVersion: generated.tokenVersion,
      pepperVersion: generated.pepperVersion,
      tokenDigest: generated.digest,
      publicTokenCiphertext: kind === "PUBLIC" ? "pending" : undefined,
      label,
      tokenHint: generated.hint,
      createdByType: actor.type,
      createdById: actor.id,
    });
    if (!credential) throw new Error("STOREFRONT_NOT_FOUND");
    return credential;
  }
}
