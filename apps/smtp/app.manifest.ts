import { defineAppManifest } from "@shopana/app-sdk";

export const smtpManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-smtp",
  version: "1.0.0",
  displayName: "SMTP",
  description: "Deliver Shopana email notifications through a store SMTP server.",
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
      operations: {
        deliver: "deliver",
      },
    },
  ],
  graphql: { admin: true, storefront: false },
});
