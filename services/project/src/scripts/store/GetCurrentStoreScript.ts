import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  GetCurrentStoreParams,
  GetCurrentStoreResult,
} from "./dto/GetCurrentStoreDto.js";

export class GetCurrentStoreScript extends BaseScript<
  GetCurrentStoreParams,
  GetCurrentStoreResult
> {
  protected async execute(
    params: GetCurrentStoreParams
  ): Promise<GetCurrentStoreResult> {
    const { name } = params;

    // 1. Find store by name (includes integrations)
    const store = await this.repository.store.findByName(name);

    if (!store) {
      return {
        store: null,
        userErrors: [
          {
            code: "STORE_NOT_FOUND",
            message: `Store with name "${name}" not found`,
            field: ["name"],
          },
        ],
      };
    }

    return {
      store,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): GetCurrentStoreResult {
    return {
      store: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          field: null,
        },
      ],
    };
  }
}
