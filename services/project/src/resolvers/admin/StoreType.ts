import { Cache } from "@shopana/type-resolver";
import type { Store } from "../../repositories/models/store.js";
import type { LocaleCode, CurrencyCode } from "@shopana/shared-references";
import { BaseResolver } from "./BaseResolver.js";

export { BaseResolver };

/**
 * Store type resolver - resolves Store GraphQL type
 * Accepts store ID, loads data lazily via repository
 */
export class StoreResolver extends BaseResolver<string, Store | null> {
  @Cache({
    cacheName: "store",
    key: (resolver: StoreResolver) => resolver.value,
  })
  async loadData() {
    const result = await this.ctx.kernel
      .getServices()
      .repository.store.findById(this.value);
    return result ?? null;
  }

  id() {
    return this.value;
  }

  async name() {
    return this.get("name");
  }

  async slug() {
    return this.get("slug");
  }

  async status() {
    return this.get("status");
  }

  async timezone() {
    return this.get("timezone");
  }

  async email() {
    return this.get("email");
  }

  async defaultLocale() {
    return this.get("defaultLocale");
  }

  async baseCurrency() {
    return this.get("baseCurrency");
  }

  async defaultCurrency() {
    return this.get("defaultCurrency");
  }

  async defaultWeightUnit() {
    return this.get("defaultWeightUnit");
  }

  async defaultDimensionUnit() {
    return this.get("defaultDimensionUnit");
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }

  @Cache({
    cacheName: "store:locales",
    key: (resolver: StoreResolver) => resolver.value,
  })
  async locales(): Promise<LocaleCode[]> {
    const locales = await this.ctx.kernel
      .getServices()
      .repository.locale.findByStoreId(this.value);
    return locales?.map((l) => l.code as LocaleCode) ?? [];
  }

  @Cache({
    cacheName: "store:currencies",
    key: (resolver: StoreResolver) => resolver.value,
  })
  async currencies(): Promise<CurrencyCode[]> {
    const currencies = await this.ctx.kernel
      .getServices()
      .repository.currency.findByStoreId(this.value);
    return currencies?.map((c) => c.code as CurrencyCode) ?? [];
  }
}
