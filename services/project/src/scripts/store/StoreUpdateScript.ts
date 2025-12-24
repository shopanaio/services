import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreUpdateParams, StoreUpdateResult } from "./dto/index.js";

export class StoreUpdateScript extends BaseScript<StoreUpdateParams, StoreUpdateResult> {
  protected async execute(params: StoreUpdateParams): Promise<StoreUpdateResult> {
    const { id, name, email, timezone, defaultWeightUnit, defaultDimensionUnit } = params;

    const store = await this.repository.store.update(id, {
      name,
      email,
      timezone,
      defaultWeightUnit,
      defaultDimensionUnit,
    });

    if (!store) {
      return {
        store: undefined,
        userErrors: [{ message: "Store not found", code: "NOT_FOUND" }],
      };
    }

    return {
      store,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StoreUpdateResult {
    return {
      store: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
