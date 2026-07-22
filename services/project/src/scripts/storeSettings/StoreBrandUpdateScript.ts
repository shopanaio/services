import { Policy, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeBrandUpdateSchema,
  type StoreBrandUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreBrandUpdateScript extends StoreSettingsUpdateScript<StoreBrandUpdateParams> {
  @Policy<StoreBrandUpdateParams>({
    resource: "store.profile",
    action: "write",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.storeId}`,
  })
  @ZodSchema(storeBrandUpdateSchema)
  protected async execute(
    params: StoreBrandUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    if (!(await this.findStore(params))) return this.notFound();

    const { storeId, organizationId: _organizationId, ...brand } = params;
    await this.repository.storeSettings.upsertBrand(storeId, brand);
    return this.success(storeId);
  }
}
