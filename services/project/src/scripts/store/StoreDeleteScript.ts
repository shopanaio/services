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
    organizationId: (_, params) => params.organizationId ?? "",
    domain: (_, params) => `store:${params.id}`,
  })
  protected async execute(
    params: StoreDeleteParams
  ): Promise<StoreDeleteResult> {
    // TODO
    throw new Error("Not implemented");
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
