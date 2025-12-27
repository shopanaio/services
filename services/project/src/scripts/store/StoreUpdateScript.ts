import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreUpdateParams, StoreUpdateResult } from "./dto/index.js";

export class StoreUpdateScript extends BaseScript<
  StoreUpdateParams,
  StoreUpdateResult
> {
  @Policy<StoreUpdateParams>({
    resource: "store",
    action: "update",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.id}`,
  })
  protected async execute(
    params: StoreUpdateParams
  ): Promise<StoreUpdateResult> {
    const {
      name,
      displayName,
      email,
      timezone,
      defaultWeightUnit,
      defaultDimensionUnit,
    } = params;

    const store = await this.repository.store.update(params.id, {
      name,
      displayName,
      email,
      timezone,
      defaultWeightUnit,
      defaultDimensionUnit,
    });

    if (!store) {
      return {
        store: null,
        userErrors: [
          {
            message: "Store not found",
            code: "NOT_FOUND",
            field: null,
          },
        ],
      };
    }

    return {
      store,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): StoreUpdateResult {
    if (error instanceof AuthorizationError) {
      return { store: null, userErrors: error.errors };
    }
    return {
      store: null,
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
