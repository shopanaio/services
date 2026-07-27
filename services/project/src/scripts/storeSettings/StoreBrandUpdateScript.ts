import { Transactional, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeBrandUpdateSchema,
  type StoreBrandUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreBrandUpdateScript extends StoreSettingsUpdateScript<StoreBrandUpdateParams> {
  @ZodSchema(storeBrandUpdateSchema)
  @Transactional()
  protected async execute(
    params: StoreBrandUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    if (!(await this.findStore(params))) return this.notFound();

    const { storeId, organizationId: _organizationId, ...brand } = params;
    await this.repository.storeSettings.upsertBrand(storeId, brand);
    return this.success(storeId);
  }
}
