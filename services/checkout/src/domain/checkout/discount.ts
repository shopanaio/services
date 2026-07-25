import { Money } from "@shopana/shared-money";
import { DiscountType } from "@shopana/shared-service-api";

export type AppliedDiscountSnapshot = {
  code: string;
  appliedAt: Date;
  type: DiscountType;
  value: number | Money
  provider: string;
};
