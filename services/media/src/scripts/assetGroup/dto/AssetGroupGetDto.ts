import { z } from "zod";
import type { UserError } from "../../file/dto/shared.js";
import { ASSET_OWNER_TYPES, type AssetOwnerType } from "../../../repositories/models/index.js";

export const assetGroupGetSchema = z.object({
  ownerType: z.enum(ASSET_OWNER_TYPES),
  ownerId: z.string().min(1, "Owner ID is required"),
});

export interface AssetGroupGetParams {
  readonly ownerType: AssetOwnerType;
  readonly ownerId: string;
}

export interface AssetGroupGetResult {
  assetGroup: {
    id: string;
    ownerType: string;
    ownerId: string;
    createdAt: string;
  } | null;
  userErrors: UserError[];
}
