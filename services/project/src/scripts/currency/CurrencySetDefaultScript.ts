import { BaseScript } from "../../kernel/BaseScript.js";
import type { CurrencySetDefaultParams, CurrencySetDefaultResult } from "./dto/index.js";

export class CurrencySetDefaultScript extends BaseScript<CurrencySetDefaultParams, CurrencySetDefaultResult> {
  protected async execute(params: CurrencySetDefaultParams): Promise<CurrencySetDefaultResult> {
    const store = await this.repository.store.findById(params.storeId);
    if (!store) {
      return {
        success: false,
        userErrors: [{ message: "Store not found", code: "NOT_FOUND", field: null }],
      };
    }
    if (!store.currencies.includes(params.currency)) {
      return {
        success: false,
        userErrors: [{
          message: "Default currency must be active for the store",
          code: "DEFAULT_CURRENCY_NOT_ACTIVE",
          field: ["currency"],
        }],
      };
    }

    await this.repository.store.update(params.storeId, {
      defaultCurrency: params.currency,
    });
    return { success: true, userErrors: [] };
  }

  protected handleError(_error: unknown): CurrencySetDefaultResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR", field: null }],
    };
  }
}
