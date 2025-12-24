import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreDeleteParams, StoreDeleteResult } from "./dto/index.js";

export class StoreDeleteScript extends BaseScript<StoreDeleteParams, StoreDeleteResult> {
  protected async execute(params: StoreDeleteParams): Promise<StoreDeleteResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): StoreDeleteResult {
    return {
      deletedStoreId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
