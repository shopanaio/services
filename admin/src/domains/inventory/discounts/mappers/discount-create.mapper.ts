import type { ApiDiscountCreateInput, CurrencyCode } from "@/graphql/types";
import { DiscountMethod } from "@/graphql/types";
import type { CreateDiscountFormValues } from "../modals/create-discount-modal/schema";

interface BuildDiscountCreateInputOptions {
  currency: CurrencyCode;
  values: CreateDiscountFormValues;
}

export function buildDiscountCreateInput({
  currency,
  values,
}: BuildDiscountCreateInputOptions): ApiDiscountCreateInput {
  return {
    currency,
    kind: values.kind,
    method: values.method,
    ...(values.method === DiscountMethod.Automatic
      ? { title: values.title.trim() }
      : {}),
  };
}
