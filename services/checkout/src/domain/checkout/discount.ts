import { Money } from "@shopana/shared-money";
import { DiscountType } from "@shopana/plugin-sdk/pricing";

export type AppliedDiscountSnapshot = {
  code: string;
  appliedAt: Date;
  type: DiscountType;
  value: number | Money
  provider: string;
};
