import { BaseScript, ZodSchema } from "../../kernel/BaseScript.js";
import {
  assetGroupDeleteSchema,
  type AssetGroupDeleteParams,
  type AssetGroupDeleteResult,
} from "./dto/AssetGroupDeleteDto.js";

export class AssetGroupDeleteScript extends BaseScript<
  AssetGroupDeleteParams,
  AssetGroupDeleteResult
> {
  @ZodSchema(assetGroupDeleteSchema)
  protected async execute(
    params: AssetGroupDeleteParams
  ): Promise<AssetGroupDeleteResult> {
    this.logger.info({ params }, "AssetGroupDeleteScript: starting");

    // Find the asset group
    const assetGroup = await this.repository.assetGroup.findByOwner(
      params.ownerType,
      params.ownerId
    );

    if (!assetGroup) {
      this.logger.info(
        { params },
        "AssetGroupDeleteScript: asset group not found, nothing to delete"
      );
      return {
        deletedAssetGroupId: null,
        userErrors: [],
      };
    }

    // Delete the asset group (files will be cascade deleted via FK)
    await this.repository.assetGroup.delete(assetGroup.id);

    this.logger.info(
      { assetGroupId: assetGroup.id },
      "AssetGroupDeleteScript: completed successfully"
    );

    return {
      deletedAssetGroupId: assetGroup.id,
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): AssetGroupDeleteResult {
    return {
      deletedAssetGroupId: null,
      userErrors: [
        { message: "Failed to delete asset group", code: "INTERNAL_ERROR" },
      ],
    };
  }
}
