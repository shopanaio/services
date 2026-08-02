import type { Payments } from "@shopana/broker-types";
import type { BrokerCallContext } from "@shopana/shared-kernel";

/** Payments-owned application boundary consumed by broker action adapters. */
export interface PaymentsLifecyclePort {
  configureProviderAccount(
    params: Payments.ConfigurePaymentProviderAccountParams,
  ): Promise<Payments.ConfigurePaymentProviderAccountResult>;
  setProviderAccountStatus(
    params: Payments.SetPaymentProviderAccountStatusParams,
  ): Promise<Payments.SetPaymentProviderAccountStatusResult>;
  configureMethodCustomization(
    params: Payments.ConfigurePaymentMethodCustomizationParams,
  ): Promise<Payments.ConfigurePaymentMethodCustomizationResult>;
  setMethodCustomizationStatus(
    params: Payments.SetPaymentMethodCustomizationStatusParams,
  ): Promise<Payments.SetPaymentMethodCustomizationStatusResult>;
  createCollection(
    params: Payments.CreatePaymentCollectionParams,
  ): Promise<Payments.CreatePaymentCollectionResult>;
  getCollection(
    params: Payments.GetPaymentCollectionParams,
  ): Promise<Payments.GetPaymentCollectionResult>;
  createSession(
    params: Payments.CreatePaymentSessionParams,
  ): Promise<Payments.CreatePaymentSessionResult>;
  getSession(
    params: Payments.GetPaymentSessionParams,
  ): Promise<Payments.GetPaymentSessionResult>;
  cancel(
    params: Payments.CancelPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  capture(
    params: Payments.CapturePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  void(
    params: Payments.VoidPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  refund(
    params: Payments.RefundPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  reconcile(
    params: Payments.ReconcilePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  expire(
    params: Payments.ExpirePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  completeProviderOperation(
    params: Payments.CompleteProviderOperationParams,
    context: PaymentProviderCompletionContext,
  ): Promise<Payments.CompleteProviderOperationResult>;
  reportProviderEvent(
    params: Payments.ReportPaymentProviderEventParams,
    context: PaymentProviderCompletionContext,
  ): Promise<Payments.ReportPaymentProviderEventResult>;
}

/** Trusted Apps identity supplied by broker context, never by provider payload. */
export interface PaymentProviderCompletionContext {
  callerService: "apps";
  installationId: string;
  appCode: string;
  appVersion: string;
  appOperationId: string | null;
  executionKind: "STANDARD";
  organizationId: string;
  storeId: string;
  correlationId: string | null;
  grantedScopes: readonly string[];
}

/** Handler surface for PaymentsActions. No actions are registered by this file. */
export interface PaymentsLifecycleActionsContract {
  configurePaymentProviderAccount(
    params: Payments.ConfigurePaymentProviderAccountParams,
  ): Promise<Payments.ConfigurePaymentProviderAccountResult>;
  setPaymentProviderAccountStatus(
    params: Payments.SetPaymentProviderAccountStatusParams,
  ): Promise<Payments.SetPaymentProviderAccountStatusResult>;
  configurePaymentMethodCustomization(
    params: Payments.ConfigurePaymentMethodCustomizationParams,
  ): Promise<Payments.ConfigurePaymentMethodCustomizationResult>;
  setPaymentMethodCustomizationStatus(
    params: Payments.SetPaymentMethodCustomizationStatusParams,
  ): Promise<Payments.SetPaymentMethodCustomizationStatusResult>;
  createPaymentCollection(
    params: Payments.CreatePaymentCollectionParams,
  ): Promise<Payments.CreatePaymentCollectionResult>;
  getPaymentCollection(
    params: Payments.GetPaymentCollectionParams,
  ): Promise<Payments.GetPaymentCollectionResult>;
  createPaymentSession(
    params: Payments.CreatePaymentSessionParams,
  ): Promise<Payments.CreatePaymentSessionResult>;
  getPaymentSession(
    params: Payments.GetPaymentSessionParams,
  ): Promise<Payments.GetPaymentSessionResult>;
  cancelPayment(
    params: Payments.CancelPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  capturePayment(
    params: Payments.CapturePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  voidPayment(
    params: Payments.VoidPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  refundPayment(
    params: Payments.RefundPaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  reconcilePayment(
    params: Payments.ReconcilePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  expirePayment(
    params: Payments.ExpirePaymentParams,
  ): Promise<Payments.PaymentOperationAcceptedResult>;
  completeProviderOperation(
    params: Payments.CompleteProviderOperationParams,
    context: BrokerCallContext,
  ): Promise<Payments.CompleteProviderOperationResult>;
  reportPaymentProviderEvent(
    params: Payments.ReportPaymentProviderEventParams,
    context: BrokerCallContext,
  ): Promise<Payments.ReportPaymentProviderEventResult>;
}
