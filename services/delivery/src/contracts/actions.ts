import type { Delivery } from "@shopana/broker-types";
import type { BrokerCallContext } from "@shopana/shared-kernel";

/** Delivery-owned application boundary consumed by broker action adapters. */
export interface DeliveryLifecyclePort {
  configureProviderAccount(
    params: Delivery.ConfigureDeliveryProviderAccountParams,
  ): Promise<Delivery.ConfigureDeliveryProviderAccountResult>;
  setProviderCapabilityStatus(
    params: Delivery.SetDeliveryProviderCapabilityStatusParams,
  ): Promise<Delivery.SetDeliveryProviderCapabilityStatusResult>;
  getProviderAccount(
    params: Delivery.GetDeliveryProviderAccountParams,
  ): Promise<Delivery.GetDeliveryProviderAccountResult>;
  createShipment(
    params: Delivery.CreateDeliveryShipmentParams,
  ): Promise<Delivery.CreateDeliveryShipmentResult>;
  cancelShipment(
    params: Delivery.CancelDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult>;
  getShipment(
    params: Delivery.GetDeliveryShipmentParams,
  ): Promise<Delivery.GetDeliveryShipmentResult>;
  reconcileShipment(
    params: Delivery.ReconcileDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult>;
  completeProviderOperation(
    params: Delivery.CompleteDeliveryProviderOperationParams,
    context: DeliveryProviderCompletionContext,
  ): Promise<Delivery.CompleteDeliveryProviderOperationResult>;
  reportProviderEvent(
    params: Delivery.ReportDeliveryProviderEventParams,
    context: DeliveryProviderCompletionContext,
  ): Promise<Delivery.ReportDeliveryProviderEventResult>;
}

/** Trusted Apps identity supplied by broker context, never by provider payload. */
export interface DeliveryProviderCompletionContext {
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

/** Handler surface for DeliveryActions. This contract registers nothing. */
export interface DeliveryLifecycleActionsContract {
  configureDeliveryProviderAccount(
    params: Delivery.ConfigureDeliveryProviderAccountParams,
  ): Promise<Delivery.ConfigureDeliveryProviderAccountResult>;
  setDeliveryProviderCapabilityStatus(
    params: Delivery.SetDeliveryProviderCapabilityStatusParams,
  ): Promise<Delivery.SetDeliveryProviderCapabilityStatusResult>;
  getDeliveryProviderAccount(
    params: Delivery.GetDeliveryProviderAccountParams,
  ): Promise<Delivery.GetDeliveryProviderAccountResult>;
  createDeliveryShipment(
    params: Delivery.CreateDeliveryShipmentParams,
  ): Promise<Delivery.CreateDeliveryShipmentResult>;
  cancelDeliveryShipment(
    params: Delivery.CancelDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult>;
  getDeliveryShipment(
    params: Delivery.GetDeliveryShipmentParams,
  ): Promise<Delivery.GetDeliveryShipmentResult>;
  reconcileDeliveryShipment(
    params: Delivery.ReconcileDeliveryShipmentParams,
  ): Promise<Delivery.DeliveryOperationAcceptedResult>;
  completeDeliveryProviderOperation(
    params: Delivery.CompleteDeliveryProviderOperationParams,
    context: BrokerCallContext,
  ): Promise<Delivery.CompleteDeliveryProviderOperationResult>;
  reportDeliveryProviderEvent(
    params: Delivery.ReportDeliveryProviderEventParams,
    context: BrokerCallContext,
  ): Promise<Delivery.ReportDeliveryProviderEventResult>;
}
