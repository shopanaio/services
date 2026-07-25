import type { AdminAppUiDescriptor } from "../runtime/descriptor-schema";

export const helloWorldAdminDescriptor: AdminAppUiDescriptor = {
  installationId: "local-hello-world",
  appCode: "hello-world",
  displayName: "Hello World",
  version: "0.0.1",
  sdkVersionRange: "^1.0.0",
  remote: {
    name: "hello_world_admin",
    manifestUrl: "local:hello-world",
    contentHash: "local-development",
  },
  page: {
    module: "./Page",
    defaultPath: "",
  },
  navigation: [
    {
      id: "hello-world",
      label: "Hello World",
      path: "",
      order: 100,
    },
  ],
  modals: [
    {
      id: "greeting",
      module: "./GreetingModal",
      confirmOnDirtyClose: false,
      requiredScopes: [],
    },
  ],
  extensions: [
    {
      id: "hello-order-note",
      point: "orders.details.sidebar.after",
      module: "./OrderNote",
      priority: 100,
      requiredScopes: [],
    },
  ],
  grantedScopes: [],
};
