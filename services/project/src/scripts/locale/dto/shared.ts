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

export interface LocaleCreateParams {
  storeId: string;
  code: LocaleCode;
  isActive: boolean;
}

export interface LocaleCreateResult {
  locale: { code: LocaleCode; isActive: boolean } | null;
  userErrors: UserError[];
}

export interface LocaleDeleteParams {
  storeId: string;
  code: LocaleCode;
}

export interface LocaleDeleteResult {
  deletedLocaleCode: LocaleCode | null;
  userErrors: UserError[];
}
