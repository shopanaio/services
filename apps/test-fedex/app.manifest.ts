import { defineAppManifest } from "@shopana/app-sdk";

export const testFedexManifest = defineAppManifest({
  schemaVersion: 2,
  code: "test-fedex",
  version: "1.0.0",
  displayName: "FedEx Test",
  description: "Deterministic FedEx-inspired carrier and shipment simulator for E2E tests.",
  icon: {
    url: "/app-icons/test-fedex.svg",
    alt: "FedEx Test",
  },
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [],
  capabilities: [
    {
      key: "delivery.carrier-service",
      assignmentMode: "store",
      routingMode: "broadcast",
      operations: {
        validateCarrierServiceConfiguration: "validateCarrierServiceConfiguration",
        quoteRates: "quoteRates",
        resolveCustomerInput: "resolveCustomerInput",
      },
    },
    {
      key: "delivery.shipment-provider",
      assignmentMode: "store",
      routingMode: "broadcast",
      operations: {
        validateShipmentConfiguration: "validateShipmentConfiguration",
        createShipment: "createShipment",
        cancelShipment: "cancelShipment",
        getShipment: "getShipment",
        reconcileShipment: "reconcileShipment",
      },
    },
  ],
  graphql: { admin: false, storefront: false },
});
