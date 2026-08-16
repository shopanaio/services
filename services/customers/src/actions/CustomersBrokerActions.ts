import { Injectable } from "@nestjs/common";
import {
  CustomersComparisonActionNames,
  CustomersCheckoutActionNames,
  type Customers,
} from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  ZodSchema,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { ResolveCheckoutBuyerEligibilityScript } from "../checkout-pipeline/ResolveCheckoutBuyerEligibilityScript.js";
import {
  parseResolveBuyerEligibilityResult,
  resolveBuyerEligibilityParamsSchema,
} from "../checkout-pipeline/schemas.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { code: string; message: string }[];
};

@Injectable()
export class CustomersBrokerActions extends BrokerActions {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Action(CustomersCheckoutActionNames.resolveBuyerEligibility, {
    readOnly: true,
  })
  @ZodSchema(resolveBuyerEligibilityParamsSchema)
  async resolveCheckoutBuyerEligibility(
    params: Customers.ResolveCheckoutBuyerEligibilityParams,
    callContext: BrokerCallContext
  ): Promise<Customers.ResolveCheckoutBuyerEligibilityResult> {
    const startedAt = Date.now();
    let result: Customers.ResolveCheckoutBuyerEligibilityResult;

    try {
      const store = await this.getStore(params.storeId);
      const kernel = Kernel.getInstance();
      const context = new ServiceContext({
        requestId:
          callContext.app?.correlationId ??
          `customers-checkout-eligibility-${Date.now()}`,
        kernel,
        loaders: new Loader(kernel.repository),
        locale: store.defaultLocale,
        currency: store.currencyCode,
        store,
      });
      result = await runWithContext(context, () =>
        kernel.runScript(ResolveCheckoutBuyerEligibilityScript, params)
      );
    } catch (error) {
      this.logger.error(
        {
          action: CustomersCheckoutActionNames.resolveBuyerEligibility,
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "Customer checkout eligibility action failed"
      );
      result = {
        ok: false,
        code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
        message: "Buyer eligibility could not be resolved.",
        retryable: true,
      };
    }

    const parsed = parseResolveBuyerEligibilityResult(params, result);
    this.logger.log({
      action: CustomersCheckoutActionNames.resolveBuyerEligibility,
      durationMs: Date.now() - startedAt,
      outcomeCode: parsed.ok ? "OK" : parsed.code,
      retryable: parsed.ok ? false : parsed.retryable,
    });
    return parsed;
  }

  @Action(CustomersComparisonActionNames.getSelection, { readOnly: true })
  async getCustomerComparisonSelection(
    params: Customers.GetCustomerComparisonSelectionParams,
    callContext: BrokerCallContext,
  ): Promise<Customers.GetCustomerComparisonSelectionResult> {
    if (
      callContext.caller.kind !== "action" ||
      callContext.caller.service !== "catalog"
    ) {
      return {
        ok: false,
        code: "CUSTOMER_COMPARISON_CALLER_FORBIDDEN",
        message: "Only Catalog may read persisted comparison selections",
        retryable: false,
      };
    }

    try {
      const store = await this.getStore(params.storeId);
      const kernel = Kernel.getInstance();
      const context = new ServiceContext({
        requestId:
          callContext.app?.correlationId ??
          `customers-comparison-selection-${Date.now()}`,
        kernel,
        loaders: new Loader(kernel.repository),
        locale: store.defaultLocale,
        currency: store.currencyCode,
        store,
      });
      return await runWithContext(context, async () => {
        const customer = await kernel.repository.customer.findById(
          params.customerId,
        );
        if (!customer || customer.lifecycleStatus !== "ACTIVE") {
          return {
            ok: false as const,
            code: "CUSTOMER_NOT_FOUND" as const,
            message: "Customer was not found",
            retryable: false,
          };
        }
        const selection = await kernel.repository.comparison.getSelection(
          params.customerId,
        );
        return {
          ok: true as const,
          revision: selection.revision,
          items: selection.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            position: item.position,
          })),
        };
      });
    } catch {
      return {
        ok: false,
        code: "CUSTOMER_COMPARISON_READ_FAILED",
        message: "Customer comparison selection could not be read",
        retryable: true,
      };
    }
  }

  private async getStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId }
    );
    if (!result.store) {
      throw new Error("Customers store was not found");
    }
    return result.store;
  }
}
