import {
  Policy,
  AuthorizationError,
  hashContent,
} from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreDeleteParams, StoreDeleteResult } from "./dto/index.js";
import type { StoreDeleteOutput } from "../../sagas/index.js";

export class StoreDeleteScript extends BaseScript<
  StoreDeleteParams,
  StoreDeleteResult
> {
  @Policy<StoreDeleteParams>({
    resource: "org.stores",
    action: "admin",
    organizationId: (_, params) => params.organizationId,
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

    const result = await this.broker.runSaga<StoreDeleteOutput>(
      "project.storeDelete",
      {
        storeId: params.id,
        organizationId: params.organizationId,
        userId: this.context.user?.id,
      },
      {
        source: "content",
        resourceId: params.id,
        operation: "storeDelete",
        contentHash: hashContent({ storeId: params.id }),
      }
    );

    if (!result.success || !result.data) {
      return {
        deletedStoreId: undefined,
        userErrors: [
          {
            message: result.error?.message ?? "Failed to delete store",
            code: "DELETE_FAILED",
            field: null,
          },
        ],
      };
    }

    return {
      deletedStoreId: result.data.deletedStoreId,
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
