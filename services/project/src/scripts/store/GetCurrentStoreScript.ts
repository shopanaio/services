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
    const { slug } = params;

    // 1. Find store by slug (includes integrations)
    const store = await this.repository.store.findBySlug(slug);

    if (!store) {
      return {
        store: undefined,
        userErrors: [
          {
            code: "STORE_NOT_FOUND",
            message: `Store with slug "${slug}" not found`,
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
      store: undefined,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      ],
    };
  }
}
