import { Policy, AuthorizationError } from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { StoreUpdateParams, StoreUpdateResult } from "./dto/index.js";
import { validateStoreSettings } from "./storeSettingsRules.js";

export class StoreUpdateScript extends BaseScript<
  StoreUpdateParams,
  StoreUpdateResult
> {
  @Policy<StoreUpdateParams>({
    resource: "store.profile",
    action: "write",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.id}`,
  })
  protected async execute(
    params: StoreUpdateParams
  ): Promise<StoreUpdateResult> {
    // Check if store exists and belongs to the organization
    const existingStore = await this.repository.store.findById(
      params.id,
      params.organizationId
    );

    if (!existingStore) {
      return {
        store: null,
        userErrors: [
          {
            message: "Store not found",
            code: "NOT_FOUND",
            field: null,
          },
        ],
      };
    }

    const settingsErrors = validateStoreSettings({
      locales: params.locales ?? existingStore.locales,
      defaultLocale: existingStore.defaultLocale,
    });
    if (settingsErrors.length > 0) {
      return { store: null, userErrors: settingsErrors };
    }

    const {
      name,
      displayName,
      email,
      timezone,
      defaultWeightUnit,
      defaultDimensionUnit,
      locales,
      currencyCode,
    } = params;

    const store = await this.repository.store.update(params.id, {
      name,
      displayName,
      email,
      timezone,
      defaultWeightUnit,
      defaultDimensionUnit,
      locales,
      currencyCode,
    });

    return {
      store,
      userErrors: [],
    };
  }

  protected handleError(error: unknown): StoreUpdateResult {
    if (error instanceof AuthorizationError) {
      return { store: null, userErrors: error.errors };
    }
    return {
      store: null,
      userErrors: [
        {
          message: "Internal error",
          code: "INTERNAL_ERROR",
          field: null,
        },
      ],
    };
  }
}
