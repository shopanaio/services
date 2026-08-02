import { Injectable } from "@nestjs/common";
import {
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

  private async getStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId }
    );
    if (!result.store) {
      throw new Error("Customers checkout store was not found");
    }
    return result.store;
  }
}
