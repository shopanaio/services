import {
  Authorize,
  ZodSchema,
  ValidationError,
  AuthorizationError,
} from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  storeCreateInputSchema,
  type StoreCreateParams,
  type StoreCreateResult,
} from "./dto/index.js";
import type { StoreCreateWorkflow } from "../../workflows/index.js";

export class StoreCreateScript extends BaseScript<
  StoreCreateParams,
  StoreCreateResult
> {
  @Authorize({ resource: "store", action: "create" })
  @ZodSchema(storeCreateInputSchema)
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
      email: params.email ?? undefined,
    });

    const store = await this.repository.store.findById(result.storeId);

    return {
      store,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): StoreCreateResult {
    if (error instanceof ValidationError) {
      return { store: null, userErrors: error.errors };
    }
    if (error instanceof AuthorizationError) {
      return { store: null, userErrors: error.errors };
    }

    return {
      store: null,
      userErrors: [
        {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          field: null,
        },
      ],
    };
  }
}
