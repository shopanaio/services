import { and, asc, eq, isNull } from "drizzle-orm";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  storeAddress,
  storeBrand,
  storeBrandSocialLink,
  storeCurrencyFormatting,
  storeOrderSettings,
  storePhone,
  store,
  type AutomaticFulfillmentMode,
  type CurrencyCode,
  type CurrencyDisplay,
  type CurrencyGrouping,
  type CurrencyRoundingMode,
  type CurrencySign,
  type CurrencySignDisplay,
  type CurrencyTrailingZeroDisplay,
  type DimensionUnit,
  type StoreAddress,
  type StoreBrand,
  type StoreBrandSocialLink,
  type StoreCurrencyFormatting,
  type StoreOrderSettings,
  type StorePhone,
  type UnitSystem,
  type WeightUnit,
} from "../models/index.js";

export interface StoreSettingsSnapshot {
  address: StoreAddress | null;
  phones: StorePhone[];
  brand: StoreBrand | null;
  socialLinks: StoreBrandSocialLink[];
  orderProcessing: StoreOrderSettings | null;
  currencyFormatting: StoreCurrencyFormatting | null;
}

export interface StoreAddressData {
  companyName: string | null;
  countryCode: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  administrativeArea: string | null;
  postalCode: string | null;
}

export interface StoreContactDetailsData {
  name: string;
  slug: string;
  email: string | null;
  phoneNumbers: string[];
}

export interface StoreSocialLinkData {
  platform: string;
  url: string;
}

export interface StoreBrandData {
  defaultLogoMediaId: string | null;
  squareLogoMediaId: string | null;
  coverImageMediaId: string | null;
  primaryColor: string;
  secondaryColor: string;
  slogan: string | null;
  shortDescription: string | null;
  socialLinks: StoreSocialLinkData[];
}

export interface StoreOrderProcessingData {
  orderNumberPrefix: string;
  orderNumberSuffix: string | null;
  requireCheckoutConfirmation: boolean;
  automaticFulfillmentMode: AutomaticFulfillmentMode;
  automaticallyArchiveOrders: boolean;
}

export interface StoreCurrencyFormattingData {
  currencyDisplay: CurrencyDisplay;
  currencySign: CurrencySign;
  grouping: CurrencyGrouping;
  signDisplay: CurrencySignDisplay;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  roundingMode: CurrencyRoundingMode;
  trailingZeroDisplay: CurrencyTrailingZeroDisplay;
}

export interface StoreDefaultsData {
  unitSystem: UnitSystem;
  defaultWeightUnit: WeightUnit;
  defaultDimensionUnit: DimensionUnit;
  timezone: string;
}

export interface StoreCurrencySettingsSnapshotData {
  currencyCode: CurrencyCode;
  formatting: StoreCurrencyFormattingData | null;
}

export class StoreSettingsRepository extends BaseRepository {
  @ReadOnly()
  async findByStoreId(storeId: string): Promise<StoreSettingsSnapshot> {
    const [addresses, phones, brands, orderSettings, currencySettings] = await Promise.all([
      this.connection.select().from(storeAddress).where(eq(storeAddress.storeId, storeId)).limit(1),
      this.connection
        .select()
        .from(storePhone)
        .where(eq(storePhone.storeId, storeId))
        .orderBy(asc(storePhone.position), asc(storePhone.id)),
      this.connection.select().from(storeBrand).where(eq(storeBrand.storeId, storeId)).limit(1),
      this.connection
        .select()
        .from(storeOrderSettings)
        .where(eq(storeOrderSettings.storeId, storeId))
        .limit(1),
      this.connection
        .select()
        .from(storeCurrencyFormatting)
        .where(eq(storeCurrencyFormatting.storeId, storeId))
        .limit(1),
    ]);

    const brand = brands[0] ?? null;
    const socialLinks = brand
      ? await this.connection
          .select()
          .from(storeBrandSocialLink)
          .where(
            and(
              eq(storeBrandSocialLink.storeId, storeId),
              eq(storeBrandSocialLink.brandId, brand.id),
            ),
          )
          .orderBy(asc(storeBrandSocialLink.position), asc(storeBrandSocialLink.id))
      : [];

    return {
      address: addresses[0] ?? null,
      phones,
      brand,
      socialLinks,
      orderProcessing: orderSettings[0] ?? null,
      currencyFormatting: currencySettings[0] ?? null,
    };
  }

  async replacePhones(storeId: string, phoneNumbers: string[]): Promise<void> {
    await this.connection.delete(storePhone).where(eq(storePhone.storeId, storeId));

    if (phoneNumbers.length === 0) return;

    const now = new Date().toISOString();
    await this.connection.insert(storePhone).values(
      phoneNumbers.map((phoneNumber, position) => ({
        storeId,
        phoneNumber,
        position,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  async upsertAddress(storeId: string, data: StoreAddressData): Promise<StoreAddress> {
    const now = new Date().toISOString();
    const [result] = await this.connection
      .insert(storeAddress)
      .values({
        storeId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: storeAddress.storeId,
        set: { ...data, updatedAt: now },
      })
      .returning();

    return result;
  }

  async upsertBrand(storeId: string, data: StoreBrandData): Promise<StoreBrand> {
    const { socialLinks, ...brandData } = data;
    const now = new Date().toISOString();
    const [brand] = await this.connection
      .insert(storeBrand)
      .values({
        storeId,
        ...brandData,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: storeBrand.storeId,
        set: { ...brandData, updatedAt: now },
      })
      .returning();

    await this.connection
      .delete(storeBrandSocialLink)
      .where(
        and(eq(storeBrandSocialLink.storeId, storeId), eq(storeBrandSocialLink.brandId, brand.id)),
      );

    if (socialLinks.length > 0) {
      await this.connection.insert(storeBrandSocialLink).values(
        socialLinks.map((link, position) => ({
          storeId,
          brandId: brand.id,
          platform: link.platform,
          url: link.url,
          position,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    return brand;
  }

  async upsertOrderProcessing(
    storeId: string,
    data: StoreOrderProcessingData,
  ): Promise<StoreOrderSettings> {
    const now = new Date().toISOString();
    const [result] = await this.connection
      .insert(storeOrderSettings)
      .values({
        storeId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: storeOrderSettings.storeId,
        set: { ...data, updatedAt: now },
      })
      .returning();

    return result;
  }

  async upsertCurrencyFormatting(
    storeId: string,
    data: StoreCurrencyFormattingData,
  ): Promise<StoreCurrencyFormatting> {
    const now = new Date().toISOString();
    const [result] = await this.connection
      .insert(storeCurrencyFormatting)
      .values({
        storeId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: storeCurrencyFormatting.storeId,
        set: { ...data, updatedAt: now },
      })
      .returning();

    return result;
  }

  @Transactional()
  async restoreContactDetails(storeId: string, data: StoreContactDetailsData): Promise<void> {
    await this.connection
      .update(store)
      .set({
        name: data.slug,
        displayName: data.name,
        email: data.email,
        updatedAt: new Date(),
      })
      .where(and(eq(store.id, storeId), isNull(store.deletedAt)));
    await this.replacePhones(storeId, data.phoneNumbers);
  }

  @Transactional()
  async restoreAddress(storeId: string, data: StoreAddressData | null): Promise<void> {
    if (data) {
      await this.upsertAddress(storeId, data);
      return;
    }
    await this.connection.delete(storeAddress).where(eq(storeAddress.storeId, storeId));
  }

  @Transactional()
  async restoreBrand(storeId: string, data: StoreBrandData | null): Promise<void> {
    if (data) {
      await this.upsertBrand(storeId, data);
      return;
    }
    await this.connection
      .delete(storeBrandSocialLink)
      .where(eq(storeBrandSocialLink.storeId, storeId));
    await this.connection.delete(storeBrand).where(eq(storeBrand.storeId, storeId));
  }

  @Transactional()
  async restoreOrderProcessing(
    storeId: string,
    data: StoreOrderProcessingData | null,
  ): Promise<void> {
    if (data) {
      await this.upsertOrderProcessing(storeId, data);
      return;
    }
    await this.connection.delete(storeOrderSettings).where(eq(storeOrderSettings.storeId, storeId));
  }

  @Transactional()
  async restoreDefaults(storeId: string, data: StoreDefaultsData): Promise<void> {
    await this.connection
      .update(store)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(store.id, storeId), isNull(store.deletedAt)));
  }

  @Transactional()
  async restoreCurrencySettings(
    storeId: string,
    data: StoreCurrencySettingsSnapshotData,
  ): Promise<void> {
    await this.connection
      .update(store)
      .set({
        currencyCode: data.currencyCode,
        updatedAt: new Date(),
      })
      .where(and(eq(store.id, storeId), isNull(store.deletedAt)));

    if (data.formatting) {
      await this.upsertCurrencyFormatting(storeId, data.formatting);
      return;
    }
    await this.connection
      .delete(storeCurrencyFormatting)
      .where(eq(storeCurrencyFormatting.storeId, storeId));
  }
}
