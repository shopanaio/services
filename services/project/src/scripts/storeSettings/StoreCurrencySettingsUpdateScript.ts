import { Transactional, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeCurrencySettingsUpdateSchema,
  type StoreCurrencySettingsUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreCurrencySettingsUpdateScript extends StoreSettingsUpdateScript<StoreCurrencySettingsUpdateParams> {
  @ZodSchema(storeCurrencySettingsUpdateSchema)
  @Transactional()
  protected async execute(
    params: StoreCurrencySettingsUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    const store = await this.findStore(params);
    if (!store) return this.notFound();

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
