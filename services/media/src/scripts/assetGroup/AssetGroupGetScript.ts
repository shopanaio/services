import { BaseScript, ZodSchema } from "../../kernel/BaseScript.js";
import {
  assetGroupGetSchema,
  type AssetGroupGetParams,
  type AssetGroupGetResult,
} from "./dto/AssetGroupGetDto.js";

export class AssetGroupGetScript extends BaseScript<
  AssetGroupGetParams,
  AssetGroupGetResult
> {
  @ZodSchema(assetGroupGetSchema)
  protected async execute(
    params: AssetGroupGetParams
  ): Promise<AssetGroupGetResult> {
    this.logger.info({ params }, "AssetGroupGetScript: starting");

    const assetGroup = await this.repository.assetGroup.findByOwner(
      params.ownerType,
      params.ownerId
    );

    if (!assetGroup) {
      this.logger.info(
        { params },
        "AssetGroupGetScript: asset group not found"
      );
      return {
        assetGroup: null,
        userErrors: [],
      };
    }

    this.logger.info(
      { assetGroupId: assetGroup.id },
      "AssetGroupGetScript: completed successfully"
    );

    return {
      assetGroup: {
        id: assetGroup.id,
        ownerType: assetGroup.ownerType,
        ownerId: assetGroup.ownerId,
        createdAt: assetGroup.createdAt,
      },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): AssetGroupGetResult {
    return {
      assetGroup: null,
      userErrors: [
        { message: "Failed to get asset group", code: "INTERNAL_ERROR" },
      ],
    };
  }
}
