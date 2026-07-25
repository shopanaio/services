import { defineAppManifest } from "@shopana/app-sdk";

export const helloWorldManifest = defineAppManifest({
  schemaVersion: 2,
  code: "hello-world",
  version: "0.0.1",
  displayName: "Hello World",
  description:
    "Minimal bundled Shopana App used to validate the hosted App runtime.",
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
      key: "greeting",
      operations: {
        hello: "hello",
      },
    },
  ],
  graphql: {
    admin: true,
    storefront: false,
  },
});
