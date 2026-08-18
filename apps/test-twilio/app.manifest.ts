import { defineAppManifest } from "@shopana/app-sdk";

export const testTwilioManifest = defineAppManifest({
  schemaVersion: 2,
  code: "test-twilio",
  version: "1.0.0",
  displayName: "Twilio Test",
  description: "Deterministic in-memory SMS gateway for authentication tests.",
  icon: { url: "/app-icons/test-twilio.svg", alt: "Twilio Test" },
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
      key: "notifications",
      assignmentMode: "store",
      operations: { deliver: "deliver", getCapabilities: "getCapabilities" },
    },
  ],
  graphql: { admin: false, storefront: false },
});
