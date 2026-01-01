import { Cache, TypePolicy } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Store } from "../../repositories/store/StoreRepository.js";
import type { LocaleCode, CurrencyCode } from "@shopana/shared-references";
import { BaseResolver } from "./BaseResolver.js";

export { BaseResolver };

/**
 * Store type resolver - resolves Store GraphQL type
 * Accepts pre-loaded StoreRecord from database
 */
@TypePolicy<StoreResolver>({
  organizationId: (resolver) => resolver.$props.organizationId,
  domain: (resolver) => `store:${resolver.$props.id}`,
  resource: "store.profile",
  action: "read",
  onDeny: "null",
})
export class StoreResolver extends BaseResolver<Store, Store> {
  async $preload() {
    return this.$props;
  }

  id() {
    return encodeGlobalIdByType(this.$props.id, GlobalIdEntity.Store);
  }

  async name() {
    return this.$get("name");
  }

  async organization() {
    const organizationId = await this.$get("organizationId");
    return {
      __typename: "Organization" as const,
      id: encodeGlobalIdByType(organizationId, GlobalIdEntity.Organization),
    };
  }

  async membership() {
    return {
      __typename: "Membership" as const,
      domain: `store:${this.$props.id}`,
      organizationId: await this.$get("organizationId"),
    };
  }

  async displayName() {
    return this.$get("displayName");
  }

  async status() {
    const status = await this.$get("status");
    return status.toUpperCase();
  }

  async timezone() {
    return this.$get("timezone");
  }

  async email() {
    return this.$get("email");
  }

  async defaultLocale() {
    return this.$get("defaultLocale");
  }

  async baseCurrency() {
    return this.$get("baseCurrency");
  }

  async defaultCurrency() {
    return this.$get("defaultCurrency");
  }

  async defaultWeightUnit() {
    return this.$get("defaultWeightUnit");
  }

  async defaultDimensionUnit() {
    return this.$get("defaultDimensionUnit");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async locales(): Promise<LocaleCode[]> {
    const locales = await this.$ctx.kernel
      .getServices()
      .repository.locale.findByStoreId(this.$props.id);
    return locales?.map((l) => l.code as LocaleCode) ?? [];
  }

  async currencies(): Promise<CurrencyCode[]> {
    const currencies = await this.$ctx.kernel
      .getServices()
      .repository.currency.findByStoreId(this.$props.id);
    return currencies?.map((c) => c.code as CurrencyCode) ?? [];
  }
}
