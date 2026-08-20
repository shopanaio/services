import { Injectable } from "@nestjs/common";
import {
  PaymentsActionNames,
  PaymentsCheckoutActionNames,
  type Payments,
} from "@shopana/broker-types";
import {
  Action,
  BrokerActions,
  InjectBroker,
  type BrokerCallContext,
  type ServiceBroker,
  ZodSchema,
} from "@shopana/shared-kernel";
import {
  CompleteProviderOperationParamsSchema,
  PaymentLifecycleActionSchemas,
  ReportPaymentProviderEventParamsSchema,
  parseProviderCompletionContext,
} from "../../contracts/schemas.js";
import {
  parsePaymentsCheckoutRequest,
  parsePaymentsCheckoutResult,
} from "../../checkout-pipeline/schemas.js";
import { PaymentsCheckoutError } from "../../checkout-pipeline/errors.js";
import { PaymentsCheckoutMethodsService } from "../../checkout-pipeline/PaymentsCheckoutMethodsService.js";
import {
  deterministicProviderAccountId,
  PaymentProviderAccountService,
} from "../../application/PaymentProviderAccountService.js";
import { PaymentMethodCustomizationService } from "../../application/PaymentMethodCustomizationService.js";
import { PaymentLifecycleService } from "../../application/PaymentLifecycleService.js";

@Injectable()
export class PaymentsActions extends BrokerActions {
  constructor(
    @InjectBroker("payments") broker: ServiceBroker,
    private readonly checkout: PaymentsCheckoutMethodsService,
    private readonly accounts: PaymentProviderAccountService,
    private readonly customizations: PaymentMethodCustomizationService,
    private readonly lifecycle: PaymentLifecycleService,
  ) {
    super(broker);
  }

  @Action(PaymentsCheckoutActionNames.getAvailableMethods)
  async getCheckoutAvailablePaymentMethods(raw: unknown, context: BrokerCallContext) {
    if (context.caller.kind !== "action" || context.caller.service !== "checkout" || context.app)
      throw new PaymentsCheckoutError(
        "PAYMENT_DISCOVERY_REQUEST_INVALID",
        "Only Checkout may calculate checkout payment methods.",
        false,
      );
    let params: Payments.GetCheckoutAvailablePaymentMethodsParams;
    try {
      params = parsePaymentsCheckoutRequest(raw);
    } catch (error) {
      throw new PaymentsCheckoutError(
        "PAYMENT_DISCOVERY_REQUEST_INVALID",
        "Payments received an invalid checkout discovery request.",
        false,
        { cause: error },
      );
    }
    const result = await this.checkout.getAvailableMethods(params);
    try {
      return parsePaymentsCheckoutResult(result);
    } catch (error) {
      throw new PaymentsCheckoutError(
        "PAYMENT_PROVIDER_RESPONSE_INVALID",
        "Payments produced an invalid checkout discovery result.",
        false,
        { cause: error },
      );
    }
  }

  @Action(PaymentsActionNames.configureProviderAccount)
  @ZodSchema(PaymentLifecycleActionSchemas.configureProviderAccount)
  async configurePaymentProviderAccount(params: Payments.ConfigurePaymentProviderAccountParams) {
    const providerAccountId = deterministicProviderAccountId(params.storeId, params.installationId);
    const duplicate = await this.accounts.isConfigured(params);
    const started = await this.broker.startWorkflow(
      "payments.configureProviderAccount",
      { params, providerAccountId },
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: `${params.installationId}:${params.idempotencyKey}`,
        operation: "payments.configureProviderAccount",
        content: {
          storeId: params.storeId,
          installationId: params.installationId,
          mode: params.mode,
          captureMode: params.captureMode,
          enabledMethodKeys: params.enabledMethodKeys,
        },
      },
    );
    return { providerAccountId, workflowId: started.workflowId, duplicate };
  }

  @Action(PaymentsActionNames.setProviderAccountStatus)
  @ZodSchema(PaymentLifecycleActionSchemas.setProviderAccountStatus)
  setPaymentProviderAccountStatus(params: Payments.SetPaymentProviderAccountStatusParams) {
    return this.accounts.setStatus(params);
  }

  @Action(PaymentsActionNames.configureMethodCustomization)
  @ZodSchema(PaymentLifecycleActionSchemas.configureMethodCustomization)
  configurePaymentMethodCustomization(params: Payments.ConfigurePaymentMethodCustomizationParams) {
    return this.customizations.configure(params);
  }

  @Action(PaymentsActionNames.setMethodCustomizationStatus)
  @ZodSchema(PaymentLifecycleActionSchemas.setMethodCustomizationStatus)
  setPaymentMethodCustomizationStatus(params: Payments.SetPaymentMethodCustomizationStatusParams) {
    return this.customizations.setStatus(params);
  }

  @Action(PaymentsActionNames.createCollection)
  @ZodSchema(PaymentLifecycleActionSchemas.createCollection)
  createPaymentCollection(params: Payments.CreatePaymentCollectionParams) {
    return this.broker.runWorkflow<Payments.CreatePaymentCollectionResult>(
      "payments.createCollection",
      params,
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: params.orderId,
        operation: "payments.createCollection",
        content: {
          checkoutId: params.checkoutId,
          checkoutVersion: params.expectedCheckoutVersion,
          finalQuoteRevision: params.finalQuoteRevision,
          targetAmount: params.targetAmount,
          idempotencyKey: params.idempotencyKey,
        },
      },
    );
  }

  @Action(PaymentsActionNames.getCollection)
  getPaymentCollection(params: Payments.GetPaymentCollectionParams) {
    return this.lifecycle.getCollection(params);
  }

  @Action(PaymentsActionNames.createSession)
  @ZodSchema(PaymentLifecycleActionSchemas.createSession)
  createPaymentSession(params: Payments.CreatePaymentSessionParams) {
    return this.broker.runWorkflow<Payments.CreatePaymentSessionResult>(
      "payments.createSession",
      params,
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: params.paymentCollectionId,
        operation: "payments.createSession",
        content: {
          checkoutId: params.checkoutId,
          checkoutVersion: params.expectedCheckoutVersion,
          finalQuoteRevision: params.finalQuoteRevision,
          paymentMethodsRevision: params.paymentMethodsRevision,
          methodHandle: params.methodHandle,
          kind: params.kind,
          amount: params.amount,
          expiresAt: params.expiresAt,
          idempotencyKey: params.idempotencyKey,
        },
      },
    );
  }

  @Action(PaymentsActionNames.getSession)
  getPaymentSession(params: Payments.GetPaymentSessionParams) {
    return this.lifecycle.getSession(params);
  }

  @Action(PaymentsActionNames.cancel)
  @ZodSchema(PaymentLifecycleActionSchemas.cancel)
  cancelPayment(params: Payments.CancelPaymentParams) {
    return this.runOperation("CANCEL", params);
  }

  @Action(PaymentsActionNames.capture)
  @ZodSchema(PaymentLifecycleActionSchemas.capture)
  capturePayment(params: Payments.CapturePaymentParams) {
    return this.runOperation("CAPTURE", params);
  }

  @Action(PaymentsActionNames.void)
  @ZodSchema(PaymentLifecycleActionSchemas.void)
  voidPayment(params: Payments.VoidPaymentParams) {
    return this.runOperation("VOID", params);
  }

  @Action(PaymentsActionNames.refund)
  @ZodSchema(PaymentLifecycleActionSchemas.refund)
  refundPayment(params: Payments.RefundPaymentParams) {
    return this.runOperation("REFUND", params);
  }

  @Action(PaymentsActionNames.reconcile)
  @ZodSchema(PaymentLifecycleActionSchemas.reconcile)
  reconcilePayment(params: Payments.ReconcilePaymentParams) {
    return this.runOperation("RECONCILE", params);
  }

  @Action(PaymentsActionNames.expire)
  @ZodSchema(PaymentLifecycleActionSchemas.expire)
  expirePayment(params: Payments.ExpirePaymentParams) {
    return this.broker.runWorkflow<Payments.PaymentOperationAcceptedResult>(
      "payments.expireSession",
      params,
      {
        source: "content",
        organizationId: params.organizationId,
        resourceId: params.paymentSessionId,
        operation: "payments.expireSession",
        content: {
          expectedSessionRevision: params.expectedSessionRevision,
          reason: params.reason,
          idempotencyKey: params.idempotencyKey,
        },
      },
    );
  }

  @Action(PaymentsActionNames.completeProviderOperation)
  @ZodSchema(CompleteProviderOperationParamsSchema)
  completeProviderOperation(
    params: Payments.CompleteProviderOperationParams,
    brokerContext: BrokerCallContext,
  ) {
    const context = parseProviderCompletionContext(brokerContext);
    return this.broker.runWorkflow<Payments.CompleteProviderOperationResult>(
      "payments.completeProviderOperation",
      { params, context },
      {
        source: "content",
        organizationId: context.organizationId,
        resourceId: params.operationId,
        operation: "payments.completeProviderOperation",
        content: params,
      },
    );
  }

  @Action(PaymentsActionNames.reportProviderEvent)
  @ZodSchema(ReportPaymentProviderEventParamsSchema)
  reportPaymentProviderEvent(
    params: Payments.ReportPaymentProviderEventParams,
    brokerContext: BrokerCallContext,
  ) {
    const context = parseProviderCompletionContext(brokerContext);
    return this.broker.runWorkflow<Payments.ReportPaymentProviderEventResult>(
      "payments.reportProviderEvent",
      { params, context },
      {
        source: "content",
        organizationId: context.organizationId,
        resourceId: params.providerAccountId,
        operation: "payments.reportProviderEvent",
        content: params,
      },
    );
  }

  private async runOperation(
    type: "CANCEL" | "CAPTURE" | "VOID" | "REFUND" | "RECONCILE",
    params:
      | Payments.CancelPaymentParams
      | Payments.CapturePaymentParams
      | Payments.VoidPaymentParams
      | Payments.RefundPaymentParams
      | Payments.ReconcilePaymentParams,
  ) {
    const current = await this.lifecycle.getSession({
      storeId: params.storeId,
      paymentSessionId: params.paymentSessionId,
    });
    const { correlationId, ...workflowContent } = params;
    void correlationId;
    return this.broker.runWorkflow<Payments.PaymentOperationAcceptedResult>(
      "payments.executeOperation",
      { type, params },
      {
        source: "content",
        organizationId: current.session.organizationId,
        resourceId: params.paymentSessionId,
        operation: `payments.${type.toLowerCase()}`,
        content: workflowContent,
      },
    );
  }
}
