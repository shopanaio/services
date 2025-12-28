import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreDeleteParams, StoreDeleteResult } from "./dto/index.js";

export class StoreDeleteScript extends BaseScript<
  StoreDeleteParams,
  StoreDeleteResult
> {
  @Policy<StoreDeleteParams>({
    resource: "store",
    action: "delete",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.id}`,
  })
  protected async execute(
    params: StoreDeleteParams
  ): Promise<StoreDeleteResult> {
    // Check if store exists and belongs to the organization
    const existingStore = await this.repository.store.findById(
      params.id,
      params.organizationId
    );

    if (!existingStore) {
      return {
        deletedStoreId: undefined,
        userErrors: [
          {
            message: "Store not found",
            code: "NOT_FOUND",
            field: null,
          },
        ],
      };
    }

    await this.repository.store.delete(params.id);

    return {
      deletedStoreId: params.id,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): StoreDeleteResult {
    if (error instanceof AuthorizationError) {
      return { deletedStoreId: undefined, userErrors: error.errors };
    }
    return {
      deletedStoreId: undefined,
      userErrors: [
        {
          message: "Internal error",
          code: "INTERNAL_ERROR",
          field: null,
        },
      ],
    };
  }
}
