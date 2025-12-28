import { Cache, TypePolicy } from "@shopana/type-resolver";
import type { Store } from "../../repositories/store/StoreRepository.js";
import type { LocaleCode, CurrencyCode } from "@shopana/shared-references";
import { BaseResolver } from "./BaseResolver.js";

export { BaseResolver };

/**
 * Store type resolver - resolves Store GraphQL type
 * Accepts pre-loaded StoreRecord from database
 */
@TypePolicy<StoreResolver>({
  organizationId: (resolver) => resolver.value.organizationId,
  domain: (resolver) => `store:${resolver.value.id}`,
  resource: "store.profile",
  action: "read",
  onDeny: "null",
})
export class StoreResolver extends BaseResolver<Store, Store> {
  async loadData() {
    return this.value;
  }

  id() {
    return this.value.id;
  }

  async name() {
    return this.get("name");
  }

  async organization() {
    return {
      __typename: "Organization" as const,
      id: await this.get("organizationId"),
    };
  }

  async membership() {
    return {
      __typename: "Membership" as const,
      domain: `store:${this.value}`,
      organizationId: await this.get("organizationId"),
    };
  }

  async displayName() {
    return this.get("displayName");
  }

  async status() {
    const status = await this.get("status");
    return status.toUpperCase();
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
    key: (resolver: StoreResolver) => resolver.value.id,
  })
  async locales(): Promise<LocaleCode[]> {
    const locales = await this.ctx.kernel
      .getServices()
      .repository.locale.findByStoreId(this.value.id);
    return locales?.map((l) => l.code as LocaleCode) ?? [];
  }

  @Cache({
    cacheName: "store:currencies",
    key: (resolver: StoreResolver) => resolver.value.id,
  })
  async currencies(): Promise<CurrencyCode[]> {
    const currencies = await this.ctx.kernel
      .getServices()
      .repository.currency.findByStoreId(this.value.id);
    return currencies?.map((c) => c.code as CurrencyCode) ?? [];
  }
}
