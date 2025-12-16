import { BaseScript } from "../../kernel/BaseScript.js";
import type { LocaleUpdateParams, LocaleUpdateResult } from "./dto/index.js";

export class LocaleUpdateScript extends BaseScript<LocaleUpdateParams, LocaleUpdateResult> {
  protected async execute(params: LocaleUpdateParams): Promise<LocaleUpdateResult> {
    // Create new locales
    if (params.create.length > 0) {
      await this.repository.locale.createMany(
        params.projectId,
        params.create.map((item) => ({
          code: item.code,
          isActive: item.isActive,
        }))
      );
    }

    // Update existing locales
    for (const item of params.update) {
      await this.repository.locale.update(params.projectId, item.code, {
        isActive: item.isActive,
      });
    }

    // Delete locales
    if (params.delete.length > 0) {
      await this.repository.locale.deleteMany(params.projectId, params.delete);
    }

    this.logger.info({ projectId: params.projectId }, "Locales updated");

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): LocaleUpdateResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
