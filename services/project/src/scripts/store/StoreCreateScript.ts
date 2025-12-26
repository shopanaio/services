import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreCreateParams, StoreCreateResult } from "./dto/index.js";
import type { StoreCreateWorkflow } from "../../workflows/index.js";

export class StoreCreateScript extends BaseScript<
  StoreCreateParams,
  StoreCreateResult
> {
  protected async execute(
    params: StoreCreateParams
  ): Promise<StoreCreateResult> {
    const workflow =
      this.services.workflow.get<StoreCreateWorkflow>("storeCreate");

    const result = await workflow.run({
      organizationId: params.organizationId,
      name: params.name,
      slug: params.slug,
      locales: params.locales,
      currencies: params.currencies,
      defaultCurrency: params.defaultCurrency,
      status: params.status,
      timezone: params.timezone,
      email: params.email,
    });

    const store = await this.repository.store.findById(result.storeId);

    return {
      store,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): StoreCreateResult {
    return {
      store: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
