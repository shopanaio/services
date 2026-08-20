import { defineAppManifest } from "@shopana/app-sdk";
import { PAYMENTS_PROVIDER_APP_PERMISSIONS } from "@shopana/broker-types";

export const testStripeManifest = defineAppManifest({
  schemaVersion: 2,
  code: "test-stripe",
  version: "1.0.0",
  displayName: "Stripe Test",
  description: "Deterministic Stripe-inspired payment simulator for checkout E2E tests.",
  icon: {
    url: "/app-icons/test-stripe.svg",
    alt: "Stripe Test",
  },
  lifecycle: {
    installWorkflow: "install",
    updateWorkflow: "update",
    suspendAction: "suspend",
    resumeAction: "resume",
    uninstallWorkflow: "uninstall",
    healthAction: "health",
  },
  permissions: [...PAYMENTS_PROVIDER_APP_PERMISSIONS],
  capabilities: [
    {
      key: "payments.provider",
      assignmentMode: "store",
      operations: {
        validateConfiguration: "validateConfiguration",
        getMethods: "getMethods",
        createPayment: "createPayment",
        confirmPayment: "confirmPayment",
        cancel: "cancel",
        capture: "capture",
        void: "void",
        refund: "refund",
        reconcile: "reconcile",
      },
    },
  ],
  graphql: { admin: false, storefront: false },
});
