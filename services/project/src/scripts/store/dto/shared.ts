import type { UserError } from "@shopana/shared-kernel";
import type { Store } from "../../../repositories/index.js";

export interface StorePayload {
  store: (Store & { readonly currencyExponent: number }) | null;
  userErrors: UserError[];
}
