import { BaseScript } from "../../kernel/BaseScript.js";
import type { CurrencySetDefaultParams, CurrencySetDefaultResult } from "./dto/index.js";

export class CurrencySetDefaultScript extends BaseScript<CurrencySetDefaultParams, CurrencySetDefaultResult> {
  protected async execute(params: CurrencySetDefaultParams): Promise<CurrencySetDefaultResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): CurrencySetDefaultResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
