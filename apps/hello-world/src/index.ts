import { defineApp } from "@shopana/app-sdk";
import { helloWorldManifest } from "../app.manifest.js";
import { createAdminGraphQLServer } from "./api/graphql-admin/server.js";
import { HelloWorldApp } from "./HelloWorldApp.js";

export { helloWorldManifest } from "../app.manifest.js";
export { HelloWorldApp } from "./HelloWorldApp.js";

export default defineApp({
  manifest: helloWorldManifest,
  create: (host) => new HelloWorldApp(host),
  graphql: {
    admin: {
      createServer: createAdminGraphQLServer,
    },
  },
});
