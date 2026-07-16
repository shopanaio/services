import type { UserError } from "../../../kernel/BaseScript.js";

export interface CustomerCreateParams {
  readonly email?: string | null;
  readonly phoneE164?: string | null;
  readonly prefix?: string | null;
  readonly firstName?: string | null;
  readonly middleName?: string | null;
  readonly lastName?: string | null;
  readonly suffix?: string | null;
  readonly preferredLocale?: string | null;
  readonly dateOfBirth?: string | null;
  readonly gender?: string | null;
  readonly companyName?: string | null;
  readonly jobTitle?: string | null;
  readonly note?: string | null;
  readonly moderationNote?: string | null;
  readonly source: string;
  readonly createdByUserId?: string;
}

export interface CustomerCreateResult {
  customer?: { id: string; revision: number };
  userErrors: UserError[];
}
