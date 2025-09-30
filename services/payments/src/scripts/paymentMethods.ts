import type { TransactionScript } from "@shopana/kernel";
import type { PaymentMethod, ListPaymentMethodsInput } from "@shopana/plugin-sdk/payment";

export interface GetPaymentMethodsParams extends ListPaymentMethodsInput {
  readonly projectId: string;
  readonly requestId?: string;
  readonly userAgent?: string;
}

export interface GetPaymentMethodsResult {
  methods: PaymentMethod[];
  warnings?: Array<{ code: string; message: string }>;
}

export const paymentMethods: TransactionScript<
  GetPaymentMethodsParams,
  GetPaymentMethodsResult
> = async (params, services) => {
  const { projectId, ...input } = params;
  const { broker, logger } = services;

  try {
    // Execute apps.execute to get payment methods via centralized plugin manager
    const result = await broker.call("apps.execute", {
      domain: "payment",
      operation: "list",
      params: { projectId, ...input },
    });

    const methods = result.data as PaymentMethod[] || [];
    const warnings = result.warnings || [];

    return {
      methods,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    logger.error({ error }, "paymentMethods failed");
    return {
      methods: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
