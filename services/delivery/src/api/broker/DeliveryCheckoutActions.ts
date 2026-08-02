import { Injectable, Logger } from "@nestjs/common";
import { Action, BrokerActions, InjectBroker, type BrokerCallContext, type ServiceBroker, ZodSchema } from "@shopana/shared-kernel";
import { DeliveryCheckoutActionNames, type Delivery } from "@shopana/broker-types";
import { DeliveryCheckoutService } from "../../application/checkout/DeliveryCheckoutService.js";
import { CalculateCheckoutDeliveryOptionsParamsSchema, parseCalculateCheckoutDeliveryOptionsResult, SearchDeliveryOptionChoicesParamsSchema } from "../../contracts/checkout-schemas.js";

@Injectable()
export class DeliveryCheckoutActions extends BrokerActions {
  private readonly actionLogger = new Logger(DeliveryCheckoutActions.name);
  constructor(@InjectBroker("delivery") broker: ServiceBroker, private readonly service: DeliveryCheckoutService) { super(broker); }

  @Action(DeliveryCheckoutActionNames.calculateOptions)
  @ZodSchema(CalculateCheckoutDeliveryOptionsParamsSchema)
  async calculateCheckoutDeliveryOptions(params: Delivery.CalculateCheckoutDeliveryOptionsParams, context: BrokerCallContext): Promise<Delivery.CalculateCheckoutDeliveryOptionsResult> {
    if (context.caller.kind !== "action" || context.caller.service !== "checkout") throw new Error("Only Checkout may calculate checkout delivery options");
    const started = Date.now();
    try {
      const result = parseCalculateCheckoutDeliveryOptionsResult(await this.service.calculateOptions(params));
      this.actionLogger.log({ executionId: params.context.executionId, correlationId: params.context.correlationId, checkoutId: params.context.checkoutId,
        storeId: params.context.storeId, basedOnCheckoutVersion: params.context.expectedCheckoutVersion, targetCheckoutVersion: params.context.targetCheckoutVersion,
        groupCount: result.groups.length, optionCount: result.groups.reduce((count, group) => count + group.options.length, 0),
        providerExecutionCount: result.carrierServiceExecutions.length, durationMs: Date.now() - started, status: "SUCCEEDED" }, "Delivery checkout calculation completed");
      return result;
    } catch (error) {
      this.actionLogger.error({ executionId: params.context.executionId, correlationId: params.context.correlationId, checkoutId: params.context.checkoutId,
        storeId: params.context.storeId, basedOnCheckoutVersion: params.context.expectedCheckoutVersion, targetCheckoutVersion: params.context.targetCheckoutVersion,
        durationMs: Date.now() - started, status: "FAILED", errorName: error instanceof Error ? error.name : "UnknownError" }, "Delivery checkout calculation failed");
      throw error;
    }
  }

  @Action(DeliveryCheckoutActionNames.searchOptionChoices)
  @ZodSchema(SearchDeliveryOptionChoicesParamsSchema)
  async searchDeliveryOptionChoices(params: Delivery.SearchDeliveryOptionChoicesParams): Promise<Delivery.SearchDeliveryOptionChoicesResult> {
    return this.service.searchOptionChoices(params);
  }
}
