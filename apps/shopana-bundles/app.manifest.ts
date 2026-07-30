import { defineAppManifest } from "@shopana/app-sdk";

export const bundlesManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-bundles",
  version: "0.0.1",
  displayName: "Bundles",
  description: "Create and manage product bundles in Shopana.",
  icon: {
    url: "/app-icons/bundles.svg",
    alt: "Bundles",
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
  capabilities: [],
  graphql: {
    admin: true,
    storefront: false,
  },
});
