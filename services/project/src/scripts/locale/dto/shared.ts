import type { UserError } from "@shopana/shared-kernel";
import type { LocaleCode } from "../../../repositories/models/index.js";

export interface LocaleUpdatePayload {
  success: boolean;
  userErrors: UserError[];
}

export interface LocaleSetDefaultParams {
  storeId: string;
  locale: LocaleCode;
}

export type LocaleSetDefaultResult = LocaleUpdatePayload;
