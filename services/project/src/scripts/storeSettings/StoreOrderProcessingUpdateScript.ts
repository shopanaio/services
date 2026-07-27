import { Transactional, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeOrderProcessingUpdateSchema,
  type StoreOrderProcessingUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreOrderProcessingUpdateScript extends StoreSettingsUpdateScript<StoreOrderProcessingUpdateParams> {
  @ZodSchema(storeOrderProcessingUpdateSchema)
  @Transactional()
  protected async execute(
    params: StoreOrderProcessingUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    if (!(await this.findStore(params))) return this.notFound();

    const { storeId, organizationId: _organizationId, ...settings } = params;
    await this.repository.storeSettings.upsertOrderProcessing(
      storeId,
      settings,
    );
    return this.success(storeId);
  }
}
