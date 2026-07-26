import {
  isStorefrontPermission,
  type StorefrontPermission,
} from "@shopana/shared-context";
import type {
  HeadlessStorefrontRepository,
  HeadlessStorefrontScope,
  StorefrontAccessPolicyRecord,
} from "../repositories/index.js";

export class StorefrontAccessPolicyService {
  constructor(private readonly repository: HeadlessStorefrontRepository) {}

  createDefault(
    scope: HeadlessStorefrontScope,
    connectionId: string,
    permissions: readonly StorefrontPermission[],
  ) {
    return this.repository.accessPolicy.create(
      scope,
      connectionId,
      this.validate(permissions),
    );
  }

  get(scope: HeadlessStorefrontScope, connectionId: string) {
    return this.repository.accessPolicy.findByConnectionId(
      scope,
      connectionId,
    );
  }

  async replace(
    scope: HeadlessStorefrontScope,
    input: {
      readonly connectionId: string;
      readonly expectedRevision: number;
      readonly permissions: readonly string[];
    },
  ): Promise<StorefrontAccessPolicyRecord> {
    const current = await this.get(scope, input.connectionId);
    if (!current) throw new Error("STOREFRONT_NOT_FOUND");
    if (current.revision !== input.expectedRevision) {
      throw new Error("STOREFRONT_POLICY_REVISION_CONFLICT");
    }
    const result = await this.repository.accessPolicy.replaceGrants(
      scope,
      input.connectionId,
      input.expectedRevision,
      this.validate(input.permissions),
    );
    if (!result) throw new Error("STOREFRONT_POLICY_REVISION_CONFLICT");
    return result;
  }

  private validate(values: readonly string[]): readonly StorefrontPermission[] {
    if (
      values.some((value) => !isStorefrontPermission(value)) ||
      new Set(values).size !== values.length
    ) {
      throw new Error("STOREFRONT_PERMISSION_INVALID");
    }
    return Object.freeze([...values].sort() as StorefrontPermission[]);
  }
}
