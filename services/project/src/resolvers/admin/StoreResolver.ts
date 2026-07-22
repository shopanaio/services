import { Cache, TypePolicy } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Store } from "../../repositories/store/StoreRepository.js";
import type { StoreSettingsSnapshot } from "../../repositories/storeSettings/StoreSettingsRepository.js";
import type { LocaleCode } from "@shopana/shared-references";
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
  private settingsPromise?: Promise<StoreSettingsSnapshot>;

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

  async currencyCode() {
    return this.$get("currencyCode");
  }

  async defaultWeightUnit() {
    return this.$get("defaultWeightUnit");
  }

  async defaultDimensionUnit() {
    return this.$get("defaultDimensionUnit");
  }

  async contactDetails() {
    const settings = await this.loadSettings();
    return {
      name: this.$props.displayName,
      slug: this.$props.name,
      email: this.$props.email,
      phoneNumbers: settings.phones.map(({ phoneNumber }) => phoneNumber),
    };
  }

  async address() {
    const { address } = await this.loadSettings();
    if (!address) return null;

    return {
      companyName: address.companyName,
      countryCode: address.countryCode,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      administrativeArea: address.administrativeArea,
      postalCode: address.postalCode,
    };
  }

  async brand() {
    const { brand, socialLinks } = await this.loadSettings();
    return {
      defaultLogo: this.fileReference(brand?.defaultLogoMediaId ?? null),
      squareLogo: this.fileReference(brand?.squareLogoMediaId ?? null),
      coverImage: this.fileReference(brand?.coverImageMediaId ?? null),
      primaryColor: brand?.primaryColor ?? "#1677FF",
      secondaryColor: brand?.secondaryColor ?? "#101112",
      slogan: brand?.slogan ?? null,
      shortDescription: brand?.shortDescription ?? null,
      socialLinks: socialLinks.map(({ platform, url }) => ({ platform, url })),
    };
  }

  async orderProcessing() {
    const { orderProcessing } = await this.loadSettings();
    return {
      orderNumberPrefix: orderProcessing?.orderNumberPrefix ?? "#",
      orderNumberSuffix: orderProcessing?.orderNumberSuffix ?? null,
      requireCheckoutConfirmation:
        orderProcessing?.requireCheckoutConfirmation ?? true,
      automaticFulfillmentMode: this.automaticFulfillmentMode(
        orderProcessing?.automaticFulfillmentMode ?? "disabled",
      ),
      automaticallyArchiveOrders:
        orderProcessing?.automaticallyArchiveOrders ?? true,
    };
  }

  async defaults() {
    return {
      unitSystem: this.$props.unitSystem.toUpperCase(),
      defaultWeightUnit: this.$props.defaultWeightUnit,
      defaultDimensionUnit: this.$props.defaultDimensionUnit,
      timezone: this.$props.timezone,
    };
  }

  async currencySettings() {
    const { currencyFormatting } = await this.loadSettings();
    return {
      currencyCode: this.$props.currencyCode,
      locale: this.$props.defaultLocale,
      currencyDisplay: this.enumValue(
        currencyFormatting?.currencyDisplay ?? "symbol",
      ),
      currencySign: this.enumValue(
        currencyFormatting?.currencySign ?? "standard",
      ),
      grouping: this.enumValue(currencyFormatting?.grouping ?? "auto"),
      signDisplay: this.enumValue(
        currencyFormatting?.signDisplay ?? "auto",
      ),
      minimumFractionDigits:
        currencyFormatting?.minimumFractionDigits ?? 2,
      maximumFractionDigits:
        currencyFormatting?.maximumFractionDigits ?? 2,
      roundingMode: this.enumValue(
        currencyFormatting?.roundingMode ?? "halfExpand",
      ),
      trailingZeroDisplay: this.enumValue(
        currencyFormatting?.trailingZeroDisplay ?? "auto",
      ),
    };
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async revision() {
    return this.$get("revision");
  }

  async locales(): Promise<LocaleCode[]> {
    return this.$props.locales;
  }

  private loadSettings(): Promise<StoreSettingsSnapshot> {
    this.settingsPromise ??= this.$ctx.kernel.repository.storeSettings.findByStoreId(
      this.$props.id,
    );
    return this.settingsPromise;
  }

  private fileReference(fileId: string | null) {
    if (!fileId) return null;
    return {
      __typename: "File" as const,
      id: encodeGlobalIdByType(fileId, GlobalIdEntity.File),
    };
  }

  private automaticFulfillmentMode(
    mode: "all_line_items" | "gift_cards_only" | "disabled",
  ): string {
    switch (mode) {
      case "all_line_items":
        return "ALL_LINE_ITEMS";
      case "gift_cards_only":
        return "GIFT_CARDS_ONLY";
      case "disabled":
        return "DISABLED";
    }
  }

  private enumValue(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
  }
}
