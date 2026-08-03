export const OrderReviewActionNames = {
  verifyPurchase: "verifyReviewPurchase",
} as const;

export const OrderReviewActions = {
  verifyPurchase: `order.${OrderReviewActionNames.verifyPurchase}`,
} as const;

export interface VerifyReviewPurchaseParams {
  storeId: string;
  customerId: string;
  orderId: string;
  orderLineId: string;
  productId: string;
  variantId: string | null;
}

export type VerifyReviewPurchaseResult =
  | {
      eligible: true;
      verificationMethod: "ORDER_LINE";
    }
  | {
      eligible: false;
      code:
        | "ORDER_NOT_FOUND"
        | "ORDER_NOT_ELIGIBLE"
        | "ORDER_CUSTOMER_MISMATCH"
        | "ORDER_LINE_NOT_FOUND"
        | "ORDER_LINE_PRODUCT_MISMATCH"
        | "ORDER_LINE_VARIANT_MISMATCH";
    };
