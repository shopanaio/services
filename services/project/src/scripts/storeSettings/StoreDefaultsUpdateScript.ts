import { Policy, Transactional, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeDefaultsUpdateSchema,
  type StoreDefaultsUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreDefaultsUpdateScript extends StoreSettingsUpdateScript<StoreDefaultsUpdateParams> {
  @Policy<StoreDefaultsUpdateParams>({
    resource: "store.profile",
    action: "write",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.storeId}`,
  })
  @ZodSchema(storeDefaultsUpdateSchema)
  @Transactional()
  protected async execute(
    params: StoreDefaultsUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    if (!(await this.findStore(params))) return this.notFound();

    await this.repository.store.update(params.storeId, {
      unitSystem: params.unitSystem,
      defaultWeightUnit: params.defaultWeightUnit,
      defaultDimensionUnit: params.defaultDimensionUnit,
      timezone: params.timezone,
    });
    return this.success(params.storeId);
  }
}
