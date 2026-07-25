import { defineAppManifest } from "@shopana/app-sdk";

export const onlineStoreManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-online-store",
  version: "1.0.0",
  displayName: "Online Store",
  description: "Shopana first-party online storefront sales channel.",
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
  extensions: {
    salesChannels: {
      specifications: [
        {
          handle: "online-store",
          label: "Online Store",
          connection: {
            allowMultipleConnections: false,
            requiresExternalAccount: false,
          },
          operations: {
            connect: "channelConnect",
            update: "channelUpdate",
            suspend: "channelSuspend",
            resume: "channelResume",
            disconnect: "channelDisconnect",
            health: "channelHealth",
          },
        },
      ],
    },
  },
  graphql: { admin: true, storefront: true },
});
