import { BaseScript } from "../../kernel/BaseScript.js";
import type { CurrencySetDefaultParams, CurrencySetDefaultResult } from "./dto/index.js";

export class CurrencySetDefaultScript extends BaseScript<CurrencySetDefaultParams, CurrencySetDefaultResult> {
  protected async execute(params: CurrencySetDefaultParams): Promise<CurrencySetDefaultResult> {
    // Check if currency exists
    const currency = await this.repository.currency.findByCode(params.projectId, params.currency);
    if (!currency) {
      return {
        success: false,
        userErrors: [{ message: "Currency not found", field: ["currency"], code: "NOT_FOUND" }],
      };
    }

    if (!currency.isActive) {
      return {
        success: false,
        userErrors: [{ message: "Currency is not active", field: ["currency"], code: "INVALID" }],
      };
    }

    // Update project default (display) currency
    const updated = await this.repository.project.updateDefaultCurrency(params.projectId, params.currency);

    if (!updated) {
      return {
        success: false,
        userErrors: [{ message: "Failed to update default currency", code: "UPDATE_FAILED" }],
      };
    }

    this.logger.info({ projectId: params.projectId, currency: params.currency }, "Default currency updated");

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CurrencySetDefaultResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
