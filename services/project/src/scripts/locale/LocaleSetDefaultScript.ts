import { Transactional } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { LocaleSetDefaultParams, LocaleSetDefaultResult } from "./dto/index.js";

export class LocaleSetDefaultScript extends BaseScript<
  LocaleSetDefaultParams,
  LocaleSetDefaultResult
> {
  @Transactional()
  protected async execute(params: LocaleSetDefaultParams): Promise<LocaleSetDefaultResult> {
    const store = await this.repository.store.findByIdForUpdate(params.storeId);
    if (!store) {
      return {
        success: false,
        userErrors: [{ message: "Store not found", code: "NOT_FOUND", field: null }],
      };
    }
    const language = (await this.repository.locale.findByStoreId(params.storeId)).find(
      ({ code }) => code === params.locale,
    );
    if (!language) {
      return {
        success: false,
        userErrors: [
          {
            message: "Language is not configured for the store",
            code: "LOCALE_NOT_FOUND",
            field: ["locale"],
          },
        ],
      };
    }

    if (!language.isActive) {
      await this.repository.locale.setActive(params.storeId, params.locale, true);
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
