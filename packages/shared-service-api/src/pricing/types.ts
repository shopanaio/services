import { Money } from "@shopana/shared-money";

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

export type DiscountCondition = Readonly<{
  minAmount?: Money;
}>;

export type Discount = Readonly<{
  code: string;
  type: DiscountType;
  value: number | Money;
  provider: string;
  conditions?: DiscountCondition;
}>;
