import { Policy, Transactional, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeCurrencySettingsUpdateSchema,
  type StoreCurrencySettingsUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreCurrencySettingsUpdateScript extends StoreSettingsUpdateScript<StoreCurrencySettingsUpdateParams> {
  @Policy<StoreCurrencySettingsUpdateParams>({
    resource: "store.profile",
    action: "write",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.storeId}`,
  })
  @ZodSchema(storeCurrencySettingsUpdateSchema)
  @Transactional()
  protected async execute(
    params: StoreCurrencySettingsUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    const store = await this.findStore(params);
    if (!store) return this.notFound();

    if (!store.locales.includes(params.locale)) {
      return {
        store: null,
        userErrors: [
          {
            message: "Currency locale must be active for the store",
            code: "DEFAULT_LOCALE_NOT_ACTIVE",
            field: ["locale"],
          },
        ],
      };
    }

    await this.repository.store.update(params.storeId, {
      currencyCode: params.currencyCode,
      defaultLocale: params.locale,
    });
    await this.repository.storeSettings.upsertCurrencyFormatting(
      params.storeId,
      {
        currencyDisplay: params.currencyDisplay,
        currencySign: params.currencySign,
        grouping: params.grouping,
        signDisplay: params.signDisplay,
        minimumFractionDigits: params.minimumFractionDigits,
        maximumFractionDigits: params.maximumFractionDigits,
        roundingMode: params.roundingMode,
        trailingZeroDisplay: params.trailingZeroDisplay,
      },
    );

    return this.success(params.storeId);
  }
}
