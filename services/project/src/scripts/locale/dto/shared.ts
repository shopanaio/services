import type { UserError } from "@shopana/shared-kernel";

export interface LocaleUpdatePayload {
  success: boolean;
  userErrors: UserError[];
}

export interface LocaleSetDefaultParams {
  storeId: string;
  locale: string;
}

export type LocaleSetDefaultResult = LocaleUpdatePayload;
