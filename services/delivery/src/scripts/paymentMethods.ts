import type { TransactionScript } from "@src/kernel/types";
import type { PaymentMethod, GetPaymentMethodsInput } from "@shopana/plugin-sdk/payment";

export interface GetPaymentMethodsParams extends GetPaymentMethodsInput {
  readonly projectId: string;
  readonly requestId?: string;
  readonly userAgent?: string;
}

export interface GetPaymentMethodsResult {
  methods: PaymentMethod[];
  warnings?: Array<{ code: string; message: string }>;
}

/**
 * Transaction Script: Aggregates payment methods from all shipping plugins that support it.
 */
export const paymentMethods: TransactionScript<
  GetPaymentMethodsParams,
  GetPaymentMethodsResult
> = async (params, services) => {
  const { projectId, requestId, userAgent, ...input } = params;
  const { pluginManager, broker, logger } = services;

  try {
    const slotsResult = await broker.call("apps.getSlots", {
      projectId,
      domain: "shipping",
    });
    const slots = slotsResult.slots as Array<{
      provider: string;
      data: Record<string, unknown>;
    }>;

    if (!slots || slots.length === 0) {
      logger.warn({ projectId }, "No shipping slots configured for project");
      return { methods: [], warnings: [] };
    }

    const all: PaymentMethod[] = [];
    for (const slot of slots) {
      const methods = await pluginManager.getPaymentMethods({
        pluginCode: slot.provider,
        rawConfig: (slot.data as Record<string, unknown>) ?? {},
        projectId,
        input,
      });
      if (methods?.length) all.push(...methods);
    }

    return { methods: all };
  } catch (error) {
    logger.error({ error }, "paymentMethods failed");
    return {
      methods: [],
      warnings: [{ code: "INTERNAL_ERROR", message: "Internal server error" }],
    };
  }
};
