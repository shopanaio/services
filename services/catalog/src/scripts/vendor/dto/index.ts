import type { UserError } from "../../../kernel/BaseScript.js";
import type { Vendor } from "../../../repositories/models/index.js";

export interface VendorCreateParams {
  name: string;
}

export interface VendorCreateResult {
  vendor?: Vendor;
  userErrors: UserError[];
}

export interface VendorUpdateParams {
  id: string;
  name: string;
}

export interface VendorUpdateResult {
  vendor?: Vendor;
  userErrors: UserError[];
}

export interface VendorDeleteParams {
  id: string;
}

export interface VendorDeleteResult {
  deletedVendorId?: string;
  userErrors: UserError[];
}
