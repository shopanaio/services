import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreCreateParams, StoreCreateResult } from "./dto/index.js";

export class StoreCreateScript extends BaseScript<
  StoreCreateParams,
  StoreCreateResult
> {
  protected async execute(
    params: StoreCreateParams
  ): Promise<StoreCreateResult> {
    const storeId = crypto.randomUUID();

    const store = await this.repository.store.create({
      id: storeId,
      name: params.name,
      slug: params.slug,
      locales: params.locales,
      defaultCurrency: params.defaultCurrency,
      status: params.status,
      timezone: params.timezone,
      email: params.email,
    });

    return {
      store,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StoreCreateResult {
    return {
      store: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
