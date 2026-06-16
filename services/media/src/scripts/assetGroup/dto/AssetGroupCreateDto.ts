import { z } from "zod";
import type { UserError } from "../../file/dto/shared.js";
import { ASSET_OWNER_TYPES, type AssetOwnerType } from "../../../repositories/models/index.js";

export const assetGroupCreateSchema = z.object({
  ownerType: z.enum(ASSET_OWNER_TYPES),
  ownerId: z.string().min(1, "Owner ID is required"),
});

export interface AssetGroupCreateParams {
  readonly ownerType: AssetOwnerType;
  readonly ownerId: string;
}

export interface AssetGroupCreateResult {
  assetGroup: {
    id: string;
    ownerType: string;
    ownerId: string;
  } | null;
  userErrors: UserError[];
}
