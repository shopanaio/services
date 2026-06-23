import type { UserError } from "../../../kernel/BaseScript.js";
import type { Vendor } from "../../../repositories/models/index.js";

export interface VendorCreateParams {
  name: string;
}

export interface VendorCreateResult {
  vendor?: Vendor;
  userErrors: UserError[];
}
