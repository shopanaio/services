import { Transactional } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { LocaleDeleteParams, LocaleDeleteResult } from "./dto/index.js";

export class LocaleDeleteScript extends BaseScript<LocaleDeleteParams, LocaleDeleteResult> {
  @Transactional()
  protected async execute(params: LocaleDeleteParams): Promise<LocaleDeleteResult> {
    const store = await this.repository.store.findByIdForUpdate(params.storeId);
    if (!store) {
      return {
        deletedLocaleCode: null,
        userErrors: [{ message: "Store not found", code: "NOT_FOUND", field: null }],
      };
    }
    if (store.defaultLocale === params.code) {
      return {
        deletedLocaleCode: null,
        userErrors: [
          {
            message: "The default language cannot be deleted",
            code: "DEFAULT_LOCALE_DELETE_FORBIDDEN",
            field: ["code"],
          },
        ],
      };
    }

    const deleted = await this.repository.locale.delete(params.storeId, params.code);
    if (!deleted) {
      return {
        deletedLocaleCode: null,
        userErrors: [{ message: "Language not found", code: "NOT_FOUND", field: ["code"] }],
      };
    }
    return { deletedLocaleCode: params.code, userErrors: [] };
  }

  protected handleError(_error: unknown): LocaleDeleteResult {
    return {
      deletedLocaleCode: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR", field: null }],
    };
  }
}
