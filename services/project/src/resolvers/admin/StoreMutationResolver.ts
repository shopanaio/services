import type {
  CurrencyCode,
  LocaleCode,
  WeightUnit,
  DimensionUnit,
} from "@shopana/shared-references";
import type { StoreStatus } from "../../repositories/models/index.js";
import { BaseResolver } from "./BaseResolver.js";
import { StoreResolver } from "./StoreResolver.js";
import { StoreCreateScript } from "../../scripts/store/StoreCreateScript.js";
import { StoreUpdateScript } from "../../scripts/store/StoreUpdateScript.js";
import { StoreDeleteScript } from "../../scripts/store/StoreDeleteScript.js";
import { LocaleSetDefaultScript } from "../../scripts/locale/LocaleSetDefaultScript.js";
import { CurrencySetDefaultScript } from "../../scripts/currency/CurrencySetDefaultScript.js";
import { ApiKeyCreateScript } from "../../scripts/apiKey/ApiKeyCreateScript.js";
import { ApiKeyRevokeScript } from "../../scripts/apiKey/ApiKeyRevokeScript.js";
import { ApiKeyDeleteScript } from "../../scripts/apiKey/ApiKeyDeleteScript.js";

// Input types
interface StoreCreateInput {
  organizationId: string;
  /** URL-friendly identifier (e.g., "my-store") */
  name: string;
  /** Human-readable display name (e.g., "My Store") */
  displayName: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus | null;
  timezone?: string | null;
  email: string;
}

interface StoreUpdateInput {
  id: string;
  organizationId: string;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  timezone?: string | null;
  defaultWeightUnit?: WeightUnit | null;
  defaultDimensionUnit?: DimensionUnit | null;
}

interface StoreDeleteInput {
  id: string;
  organizationId: string;
}

interface LocaleSetDefaultInput {
  locale: LocaleCode;
}

interface CurrencySetDefaultInput {
  currency: CurrencyCode;
}

interface ApiKeyCreateInput {
  name: string;
  dueDate?: string | null;
}

interface ApiKeyRevokeInput {
  id: string;
}

interface ApiKeyDeleteInput {
  id: string;
}

/**
 * StoreMutation namespace resolver.
 * Handles all store-related mutations.
 */
export class StoreMutationResolver extends BaseResolver<Record<string, never>> {
  /**
   * Helper to get the current store from storeName header.
   * Throws if store not found.
   */
  private async getCurrentStore() {
    if (!this.ctx.storeName) {
      throw new Error(
        "Store not found in request context. Ensure x-store-name header is set."
      );
    }
    const store = await this.ctx.kernel
      .getServices()
      .repository.store.findByName(this.ctx.storeName);
    if (!store) {
      throw new Error(`Store not found: ${this.ctx.storeName}`);
    }
    return store;
  }

  // ==================== Store Mutations ====================

  async storeCreate(args: { input: StoreCreateInput }) {
    const { input } = args;
    const result = await this.ctx.kernel.runScript(StoreCreateScript, {
      organizationId: input.organizationId,
      name: input.name,
      displayName: input.displayName,
      locales: input.locales,
      currencies: input.currencies,
      defaultCurrency: input.defaultCurrency,
      status: input.status ?? undefined,
      timezone: input.timezone ?? undefined,
      email: input.email,
    });

    if (!result.store) {
      return {
        store: null,
        userErrors: result.userErrors,
      };
    }

    // Return payload with StoreResolver - executor will resolve it
    return {
      store: new StoreResolver(result.store, this.ctx),
      userErrors: result.userErrors,
    };
  }

  async storeUpdate(args: { input: StoreUpdateInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.runScript(StoreUpdateScript, {
      id: input.id,
      name: input.name ?? undefined,
      organizationId: input.organizationId,
      displayName: input.displayName ?? undefined,
      email: input.email ?? undefined,
      timezone: input.timezone ?? undefined,
      defaultWeightUnit: input.defaultWeightUnit ?? undefined,
      defaultDimensionUnit: input.defaultDimensionUnit ?? undefined,
    });

    if (!result.store) {
      return {
        store: null,
        userErrors: result.userErrors,
      };
    }

    return {
      store: new StoreResolver(result.store, this.ctx),
      userErrors: result.userErrors,
    };
  }

  async storeDelete(args: { input: StoreDeleteInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.runScript(StoreDeleteScript, {
      id: input.id,
      organizationId: input.organizationId,
    });

    return {
      deletedStoreId: result.deletedStoreId ?? null,
      userErrors: result.userErrors,
    };
  }

  // ==================== Locale Mutations ====================

  async localeSetDefault(args: { input: LocaleSetDefaultInput }) {
    const store = await this.getCurrentStore();
    const result = await this.ctx.kernel.runScript(LocaleSetDefaultScript, {
      storeId: store.id,
      locale: args.input.locale,
    });

    return {
      success: result.success,
      userErrors: result.userErrors,
    };
  }

  // ==================== Currency Mutations ====================

  async currencySetDefault(args: { input: CurrencySetDefaultInput }) {
    const store = await this.getCurrentStore();
    const result = await this.ctx.kernel.runScript(CurrencySetDefaultScript, {
      storeId: store.id,
      currency: args.input.currency,
    });

    return {
      success: result.success,
      userErrors: result.userErrors,
    };
  }

  // ==================== API Key Mutations ====================

  async apiKeyCreate(args: { input: ApiKeyCreateInput }) {
    const store = await this.getCurrentStore();
    const result = await this.ctx.kernel.runScript(ApiKeyCreateScript, {
      storeId: store.id,
      name: args.input.name,
      createdById: this.ctx.user!.id,
      dueDate: args.input.dueDate ? new Date(args.input.dueDate) : undefined,
    });

    return {
      apiKey: result.apiKey ?? null,
      userErrors: result.userErrors,
    };
  }

  async apiKeyRevoke(args: { input: ApiKeyRevokeInput }) {
    const result = await this.ctx.kernel.runScript(ApiKeyRevokeScript, {
      id: args.input.id,
    });

    return {
      success: result.success,
      userErrors: result.userErrors,
    };
  }

  async apiKeyDelete(args: { input: ApiKeyDeleteInput }) {
    const result = await this.ctx.kernel.runScript(ApiKeyDeleteScript, {
      id: args.input.id,
    });

    return {
      deletedApiKeyId: result.deletedApiKeyId ?? null,
      userErrors: result.userErrors,
    };
  }
}
