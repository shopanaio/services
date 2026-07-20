import {
  ServiceLinkedResourceAuthorizationError,
  type ServiceLinkedAuthorizationDetails,
} from "@shopana/rbac";

export type BrokerAuthorizeDeniedCode = "RESOURCE_SERVICE_LINKED";

export interface BrokerAuthorizeResult {
  allowed: boolean;
  deniedReason?: string;
  deniedCode?: BrokerAuthorizeDeniedCode;
  serviceLinkedDetails?: ServiceLinkedAuthorizationDetails;
}

export function throwIfBrokerAuthorizeDenied(
  result: BrokerAuthorizeResult
): void {
  if (
    result.deniedCode === "RESOURCE_SERVICE_LINKED" &&
    result.serviceLinkedDetails
  ) {
    throw new ServiceLinkedResourceAuthorizationError(
      result.serviceLinkedDetails,
      result.deniedReason
    );
  }
}
