import type { TransactionScript } from "@shopana/shared-kernel";
import type {
  PaymentMethod,
  ListPaymentMethodsInput,
} from "@shopana/shared-service-api";

export interface GetPaymentMethodsParams extends ListPaymentMethodsInput {
  readonly storeId: string;
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
  const { storeId, ...input } = params;
  const { broker, logger } = services;

  try {
    const result = await broker.call("apps.executeCapability", {
      storeId,
      capability: "payment",
      operation: "list",
      input: { storeId, ...input },
    }) as { data?: unknown };

    const methods = (result.data as PaymentMethod[]) || [];

    return {
      methods,
    };
  } catch (error) {
    logger.error({ error }, "paymentMethods failed");
    return {
      methods: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
