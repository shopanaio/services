import { BaseScript } from "../../kernel/BaseScript.js";
import type { LocaleCreateParams, LocaleCreateResult } from "./dto/index.js";

export class LocaleCreateScript extends BaseScript<LocaleCreateParams, LocaleCreateResult> {
  protected async execute(params: LocaleCreateParams): Promise<LocaleCreateResult> {
    const store = await this.repository.store.findById(params.storeId);
    if (!store) {
      return {
        locale: null,
        userErrors: [{ message: "Store not found", code: "NOT_FOUND", field: null }],
      };
    }

    const existing = (await this.repository.locale.findByStoreId(params.storeId)).find(
      ({ code }) => code === params.code,
    );
    if (existing) {
      return {
        locale: null,
        userErrors: [
          {
            message: "Language is already configured",
            code: "LOCALE_ALREADY_EXISTS",
            field: ["code"],
          },
        ],
      };
    }

    const created = await this.repository.locale.create(params.storeId, {
      code: params.code,
      isActive: params.isActive,
    });
    if (!created) {
      return {
        locale: null,
        userErrors: [
          {
            message: "Language is already configured",
            code: "LOCALE_ALREADY_EXISTS",
            field: ["code"],
          },
        ],
      };
    }

    return {
      locale: { code: created.code, isActive: created.isActive },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): LocaleCreateResult {
    return {
      locale: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR", field: null }],
    };
  }
}
