import { defineAppManifest } from "@shopana/app-sdk";

export const onlineStoreManifest = defineAppManifest({
  schemaVersion: 2,
  code: "shopana-online-store",
  version: "1.0.0",
  displayName: "Online Store",
  description: "Shopana first-party online storefront sales channel.",
  icon: {
    url: "/app-icons/online-store.svg",
    alt: "Online Store",
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
      key: "sales-channel",
      assignmentMode: "resource",
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
  graphql: { admin: false, storefront: false },
});
