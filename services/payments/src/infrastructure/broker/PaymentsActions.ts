import { Injectable } from "@nestjs/common";
import { PaymentsActionNames, PaymentsCheckoutActionNames, type Payments } from "@shopana/broker-types";
import { Action, BrokerActions, InjectBroker, type BrokerCallContext, type ServiceBroker, ZodSchema } from "@shopana/shared-kernel";
import { PaymentLifecycleActionSchemas } from "../../contracts/schemas.js";
import { parsePaymentsCheckoutRequest, parsePaymentsCheckoutResult } from "../../checkout-pipeline/schemas.js";
import { PaymentsCheckoutError } from "../../checkout-pipeline/errors.js";
import { PaymentsCheckoutMethodsService } from "../../checkout-pipeline/PaymentsCheckoutMethodsService.js";
import { deterministicProviderAccountId, PaymentProviderAccountService } from "../../application/PaymentProviderAccountService.js";
import { PaymentMethodCustomizationService } from "../../application/PaymentMethodCustomizationService.js";

@Injectable()
export class PaymentsActions extends BrokerActions {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly checkout: PaymentsCheckoutMethodsService,
    private readonly accounts: PaymentProviderAccountService,
    private readonly customizations: PaymentMethodCustomizationService,
  ) { super(broker); }

  @Action(PaymentsCheckoutActionNames.getAvailableMethods)
  async getCheckoutAvailablePaymentMethods(raw: unknown, context: BrokerCallContext) {
    if (context.caller.kind !== "action" || context.caller.service !== "checkout" || context.app) throw new PaymentsCheckoutError("PAYMENT_DISCOVERY_REQUEST_INVALID", "Only Checkout may calculate checkout payment methods.", false);
    let params: Payments.GetCheckoutAvailablePaymentMethodsParams;
    try { params = parsePaymentsCheckoutRequest(raw); }
    catch (error) { throw new PaymentsCheckoutError("PAYMENT_DISCOVERY_REQUEST_INVALID", "Payments received an invalid checkout discovery request.", false, { cause: error }); }
    const result = await this.checkout.getAvailableMethods(params);
    try { return parsePaymentsCheckoutResult(result); }
    catch (error) { throw new PaymentsCheckoutError("PAYMENT_PROVIDER_RESPONSE_INVALID", "Payments produced an invalid checkout discovery result.", false, { cause: error }); }
  }

  @Action(PaymentsActionNames.configureProviderAccount)
  @ZodSchema(PaymentLifecycleActionSchemas.configureProviderAccount)
  async configurePaymentProviderAccount(params: Payments.ConfigurePaymentProviderAccountParams) {
    const providerAccountId = deterministicProviderAccountId(params.storeId, params.installationId);
    const duplicate = await this.accounts.isConfigured(params);
    const started = await this.broker.startWorkflow("payments.configureProviderAccount", { params, providerAccountId }, { source: "content", organizationId: params.organizationId, resourceId: `${params.installationId}:${params.idempotencyKey}`, operation: "payments.configureProviderAccount", content: { storeId: params.storeId, installationId: params.installationId, mode: params.mode, captureMode: params.captureMode, enabledMethodKeys: params.enabledMethodKeys } });
    return { providerAccountId, workflowId: started.workflowId, duplicate };
  }

  @Action(PaymentsActionNames.setProviderAccountStatus)
  @ZodSchema(PaymentLifecycleActionSchemas.setProviderAccountStatus)
  setPaymentProviderAccountStatus(params: Payments.SetPaymentProviderAccountStatusParams) { return this.accounts.setStatus(params); }

  @Action(PaymentsActionNames.configureMethodCustomization)
  @ZodSchema(PaymentLifecycleActionSchemas.configureMethodCustomization)
  configurePaymentMethodCustomization(
    params: Payments.ConfigurePaymentMethodCustomizationParams,
  ) {
    return this.customizations.configure(params);
  }

  @Action(PaymentsActionNames.setMethodCustomizationStatus)
  @ZodSchema(PaymentLifecycleActionSchemas.setMethodCustomizationStatus)
  setPaymentMethodCustomizationStatus(
    params: Payments.SetPaymentMethodCustomizationStatusParams,
  ) {
    return this.customizations.setStatus(params);
  }
}
