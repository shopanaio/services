import { Money } from "@shopana/money";
import { DiscountType } from "@shopana/pricing-plugin-kit";

export type AppliedDiscountSnapshot = {
  code: string;
  appliedAt: Date;
  type: DiscountType;
  value: number | Money
  provider: string;
};
