import {
  Policy,
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
  @Policy({
    resource: "store",
    action: "create",
    organizationId: (params) => (params as StoreCreateParams).organizationId,
  })
  @ZodSchema(storeCreateInputSchema)
  protected async execute(
    params: StoreCreateParams
  ): Promise<StoreCreateResult> {
    // Check for existing slug before running workflow
    const existingStore = await this.repository.store.findBySlug(params.slug);
    if (existingStore) {
      return {
        store: null,
        userErrors: [
          {
            code: "DUPLICATE_VALUE",
            message: "A store with this slug already exists",
            field: ["slug"],
          },
        ],
      };
    }

    const userId = this.context.user?.id;
    if (!userId) {
      return {
        store: null,
        userErrors: [
          {
            code: "UNAUTHORIZED",
            message: "User must be authenticated to create a store",
            field: null,
          },
        ],
      };
    }

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
      userId,
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

    // Handle PostgreSQL unique constraint violation (duplicate slug)
    const dbError = error as { code?: string; constraint?: string };
    if (dbError.code === "23505") {
      return {
        store: null,
        userErrors: [
          {
            code: "DUPLICATE_VALUE",
            message: "A store with this slug already exists",
            field: null,
          },
        ],
      };
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
