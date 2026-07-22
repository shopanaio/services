import { Policy, Transactional, ZodSchema } from "@shopana/shared-kernel";
import { StoreSettingsUpdateScript } from "./StoreSettingsUpdateScript.js";
import {
  storeContactDetailsUpdateSchema,
  type StoreContactDetailsUpdateParams,
  type StoreSettingsUpdateResult,
} from "./dto.js";

export class StoreContactDetailsUpdateScript extends StoreSettingsUpdateScript<StoreContactDetailsUpdateParams> {
  @Policy<StoreContactDetailsUpdateParams>({
    resource: "store.profile",
    action: "write",
    organizationId: (_, params) => params.organizationId,
    domain: (_, params) => `store:${params.storeId}`,
  })
  @ZodSchema(storeContactDetailsUpdateSchema)
  @Transactional()
  protected async execute(
    params: StoreContactDetailsUpdateParams,
  ): Promise<StoreSettingsUpdateResult> {
    const store = await this.findStore(params);
    if (!store) return this.notFound();

    const slugOwner = await this.repository.store.findByName(params.slug);
    if (slugOwner && slugOwner.id !== params.storeId) {
      return {
        store: null,
        userErrors: [
          {
            message: "A store with this slug already exists",
            code: "DUPLICATE_VALUE",
            field: ["slug"],
          },
        ],
      };
    }

    await this.repository.store.update(params.storeId, {
      name: params.slug,
      displayName: params.name,
      email: params.email,
    });
    await this.repository.storeSettings.replacePhones(
      params.storeId,
      params.phoneNumbers,
    );

    return this.success(params.storeId);
  }
}
