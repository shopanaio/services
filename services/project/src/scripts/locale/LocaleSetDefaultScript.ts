import { BaseScript } from "../../kernel/BaseScript.js";
import type { LocaleSetDefaultParams, LocaleSetDefaultResult } from "./dto/index.js";

export class LocaleSetDefaultScript extends BaseScript<LocaleSetDefaultParams, LocaleSetDefaultResult> {
  protected async execute(params: LocaleSetDefaultParams): Promise<LocaleSetDefaultResult> {
    // Check if locale exists
    const locale = await this.repository.locale.findByCode(params.projectId, params.locale);
    if (!locale) {
      return {
        success: false,
        userErrors: [{ message: "Locale not found", field: ["locale"], code: "NOT_FOUND" }],
      };
    }

    // Update project default locale
    const updated = await this.repository.project.updateDefaultLocale(params.projectId, params.locale);

    if (!updated) {
      return {
        success: false,
        userErrors: [{ message: "Failed to update default locale", code: "UPDATE_FAILED" }],
      };
    }

    this.logger.info({ projectId: params.projectId, locale: params.locale }, "Default locale updated");

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): LocaleSetDefaultResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
