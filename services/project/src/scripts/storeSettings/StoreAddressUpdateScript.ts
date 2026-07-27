import { Transactional, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeAddressUpdateSchema,
  type StoreAddressUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreAddressUpdateScript extends StoreSettingsUpdateScript<StoreAddressUpdateParams> {
  @ZodSchema(storeAddressUpdateSchema)
  @Transactional()
  protected async execute(
    params: StoreAddressUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    if (!(await this.findStore(params))) return this.notFound();

    const { storeId, organizationId: _organizationId, ...address } = params;
    await this.repository.storeSettings.upsertAddress(storeId, address);
    return this.success(storeId);
  }
}
