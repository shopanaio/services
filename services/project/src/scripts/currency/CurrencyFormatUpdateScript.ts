import { BaseScript } from "../../kernel/BaseScript.js";
import type { CurrencyFormatUpdateParams, CurrencyFormatUpdateResult } from "./dto/index.js";

export class CurrencyFormatUpdateScript extends BaseScript<CurrencyFormatUpdateParams, CurrencyFormatUpdateResult> {
  protected async execute(params: CurrencyFormatUpdateParams): Promise<CurrencyFormatUpdateResult> {
    // Check if currency exists
    const currency = await this.repository.currency.findByCode(params.projectId, params.code);
    if (!currency) {
      return {
        success: false,
        userErrors: [{ message: "Currency not found", field: ["code"], code: "NOT_FOUND" }],
      };
    }

    // Update currency format
    await this.repository.currency.updateFormat(params.projectId, params.code, {
      decimalPlaces: params.decimalPlaces,
      symbolLeft: params.symbolLeft,
      symbolRight: params.symbolRight,
      decimalSeparator: params.decimalSeparator,
      thousandsSeparator: params.thousandsSeparator,
    });

    this.logger.info({ projectId: params.projectId, currency: params.code }, "Currency format updated");

    return {
      success: true,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): CurrencyFormatUpdateResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
