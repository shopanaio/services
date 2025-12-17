import { BaseScript } from "../../kernel/BaseScript.js";
import type { LocaleSetDefaultParams, LocaleSetDefaultResult } from "./dto/index.js";

export class LocaleSetDefaultScript extends BaseScript<LocaleSetDefaultParams, LocaleSetDefaultResult> {
  protected async execute(params: LocaleSetDefaultParams): Promise<LocaleSetDefaultResult> {
    // TODO
    throw new Error("Not implemented");
  }

  protected handleError(_error: unknown): LocaleSetDefaultResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
