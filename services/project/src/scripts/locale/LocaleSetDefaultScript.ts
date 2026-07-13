import { BaseScript } from "../../kernel/BaseScript.js";
import type { LocaleSetDefaultParams, LocaleSetDefaultResult } from "./dto/index.js";

export class LocaleSetDefaultScript extends BaseScript<LocaleSetDefaultParams, LocaleSetDefaultResult> {
  protected async execute(params: LocaleSetDefaultParams): Promise<LocaleSetDefaultResult> {
    const store = await this.repository.store.findById(params.storeId);
    if (!store) {
      return {
        success: false,
        userErrors: [{ message: "Store not found", code: "NOT_FOUND", field: null }],
      };
    }
    if (!store.locales.includes(params.locale)) {
      return {
        success: false,
        userErrors: [{
          message: "Default locale must be active for the store",
          code: "DEFAULT_LOCALE_NOT_ACTIVE",
          field: ["locale"],
        }],
      };
    }

    await this.repository.store.update(params.storeId, {
      defaultLocale: params.locale,
    });
    return { success: true, userErrors: [] };
  }

  protected handleError(_error: unknown): LocaleSetDefaultResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR", field: null }],
    };
  }
}
