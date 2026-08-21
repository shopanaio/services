import type { StorefrontPermission } from "@shopana/shared-context";
import type {
  HeadlessStorefrontConnectionRecord,
  HeadlessStorefrontRepository,
  HeadlessStorefrontScope,
} from "../repositories/index.js";
import { StorefrontAccessPolicyService } from "./StorefrontAccessPolicyService.js";
import { StorefrontCredentialService } from "./StorefrontCredentialService.js";

export class HeadlessStorefrontConnectionService {
  constructor(
    private readonly repository: HeadlessStorefrontRepository,
    private readonly policies: StorefrontAccessPolicyService,
    private readonly credentials: StorefrontCredentialService,
    private readonly defaultPermissions: readonly StorefrontPermission[],
  ) {}

  createConnection(
    scope: HeadlessStorefrontScope,
    input: {
      readonly displayName: string;
      readonly permissions?: readonly StorefrontPermission[];
      readonly createdById?: string;
    },
  ) {
    const displayName = normalizeDisplayName(input.displayName);
    return this.repository.runInTransaction(async () => {
      const connection = await this.repository.connection.create(scope, {
        displayName,
        createdById: input.createdById,
      });
      const policy = await this.policies.createDefault(
        scope,
        connection.id,
        input.permissions ?? this.defaultPermissions,
      );
      if (!policy) throw new Error("STOREFRONT_CREATE_FAILED");
      const initialCredentials = await this.credentials.createInitialCredentials(
        scope,
        connection.id,
        { type: "USER", id: input.createdById },
      );
      return Object.freeze({
        connection,
        initialCredentials,
      });
    });
  }

  listConnections(scope: HeadlessStorefrontScope) {
    return this.repository.connection.list(scope);
  }

  async updateConnection(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    displayName: string,
  ) {
    const normalized = normalizeDisplayName(displayName);
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.connection.lockById(scope, connectionId);
      if (!current) throw new Error("STOREFRONT_NOT_FOUND");
      if (current.status === "DISCONNECTED") {
        throw new Error("STOREFRONT_INVALID_STATE");
      }
      return required(
        await this.repository.connection.updateDisplayName(scope, connectionId, normalized),
      );
    });
  }

  async suspendConnection(scope: HeadlessStorefrontScope, connectionId: string) {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.connection.lockById(scope, connectionId);
      if (!current) throw new Error("STOREFRONT_NOT_FOUND");
      if (current.status === "SUSPENDED") return current;
      if (current.status !== "ACTIVE") {
        throw new Error("STOREFRONT_INVALID_STATE");
      }
      return required(await this.repository.connection.suspend(scope, connectionId));
    });
  }

  async resumeConnection(scope: HeadlessStorefrontScope, connectionId: string) {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.connection.lockById(scope, connectionId);
      if (!current) throw new Error("STOREFRONT_NOT_FOUND");
      if (current.status !== "SUSPENDED") {
        throw new Error("STOREFRONT_INVALID_STATE");
      }
      const resumed = required(await this.repository.connection.resume(scope, connectionId));
      return resumed;
    });
  }

  disconnectConnection(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    actor: { readonly type: string; readonly id?: string },
  ) {
    return this.repository.runInTransaction(async () => {
      const current = await this.repository.connection.lockById(scope, connectionId);
      if (!current) throw new Error("STOREFRONT_NOT_FOUND");
      if (current.status === "DISCONNECTED") return current;
      const result = required(await this.repository.connection.disconnect(scope, connectionId));
      await this.repository.credential.revokeAllActiveByConnection(scope, connectionId, actor);
      return result;
    });
  }

  disconnectAll(
    scope: HeadlessStorefrontScope,
    actor: { readonly type: string; readonly id?: string },
  ): Promise<void> {
    return this.repository.runInTransaction(async () => {
      const connections = await this.repository.connection.list(scope);
      for (const connection of connections) {
        if (connection.status !== "DISCONNECTED") {
          await this.repository.connection.disconnect(scope, connection.id);
          await this.repository.credential.revokeAllActiveByConnection(scope, connection.id, actor);
        }
      }
    });
  }
}

function normalizeDisplayName(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) {
    throw new Error("STOREFRONT_DISPLAY_NAME_INVALID");
  }
  return normalized;
}

function required(
  value: HeadlessStorefrontConnectionRecord | null,
): HeadlessStorefrontConnectionRecord {
  if (!value) throw new Error("STOREFRONT_NOT_FOUND");
  return value;
}
