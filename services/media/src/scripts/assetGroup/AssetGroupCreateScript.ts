import { BaseScript, ZodSchema } from "../../kernel/BaseScript.js";
import {
  assetGroupCreateSchema,
  type AssetGroupCreateParams,
  type AssetGroupCreateResult,
} from "./dto/AssetGroupCreateDto.js";

export class AssetGroupCreateScript extends BaseScript<
  AssetGroupCreateParams,
  AssetGroupCreateResult
> {
  @ZodSchema(assetGroupCreateSchema)
  protected async execute(
    params: AssetGroupCreateParams
  ): Promise<AssetGroupCreateResult> {
    this.logger.info({ params }, "AssetGroupCreateScript: starting");

    // Check if asset group already exists for this owner
    const existing = await this.repository.assetGroup.findByOwner(
      params.ownerType,
      params.ownerId
    );

    if (existing) {
      this.logger.info(
        { assetGroupId: existing.id },
        "AssetGroupCreateScript: asset group already exists, returning existing"
      );
      return {
        assetGroup: {
          id: existing.id,
          ownerType: existing.ownerType,
          ownerId: existing.ownerId,
        },
        userErrors: [],
      };
    }

    // Create new asset group
    const assetGroup = await this.repository.assetGroup.create({
      ownerType: params.ownerType,
      ownerId: params.ownerId,
    });

    this.logger.info(
      { assetGroupId: assetGroup.id },
      "AssetGroupCreateScript: completed successfully"
    );

    return {
      assetGroup: {
        id: assetGroup.id,
        ownerType: assetGroup.ownerType,
        ownerId: assetGroup.ownerId,
      },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): AssetGroupCreateResult {
    return {
      assetGroup: null,
      userErrors: [
        { message: "Failed to create asset group", code: "INTERNAL_ERROR" },
      ],
    };
  }
}
