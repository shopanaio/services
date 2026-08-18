import {
  AuthorizationError,
  ValidationError,
} from "@shopana/shared-kernel";
import { BaseScript } from "../../kernel/BaseScript.js";
import type { Store } from "../../repositories/index.js";
import type { StoreSettingsUpdateResult } from "./dto.js";

export interface StoreSettingsMutationContext {
  storeId: string;
  organizationId: string;
}

export abstract class StoreSettingsUpdateScript<
  TParams extends StoreSettingsMutationContext,
> extends BaseScript<TParams, StoreSettingsUpdateResult> {
  protected findStore(params: TParams): Promise<Store | null> {
    return this.repository.store.findById(
      params.storeId,
      params.organizationId,
    );
  }

  protected async success(storeId: string): Promise<StoreSettingsUpdateResult> {
    const store = await this.repository.store.findById(storeId);
    return {
      store: store
        ? { ...store, currencyExponent: currencyExponent(store.currencyCode) }
        : null,
      userErrors: [],
    };
  }

  protected notFound(): StoreSettingsUpdateResult {
    return {
      store: null,
      userErrors: [
        { message: "Store not found", code: "NOT_FOUND", field: null },
      ],
    };
  }

  protected handleError(error: unknown): StoreSettingsUpdateResult {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      return { store: null, userErrors: error.errors };
    }

    const databaseError = error as { code?: string };
    if (databaseError.code === "23505") {
      return {
        store: null,
        userErrors: [
          {
            message: "A unique store setting already uses this value",
            code: "DUPLICATE_VALUE",
            field: null,
          },
        ],
      };
    }

    return {
      store: null,
      userErrors: [
        { message: "Internal error", code: "INTERNAL_ERROR", field: null },
      ],
    };
  }
}

function currencyExponent(currencyCode: string): number {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}
