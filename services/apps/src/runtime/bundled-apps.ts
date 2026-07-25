import helloWorld from "@shopana/app-hello-world";
import onlineStore from "@shopana/app-online-store";
import type { HostedAppDefinition } from "@shopana/app-runtime";

export const bundledApps = [
  {
    definition: helloWorld,
    moduleUrl: import.meta.resolve("@shopana/app-hello-world"),
  },
  {
    definition: onlineStore,
    moduleUrl: import.meta.resolve("@shopana/app-online-store"),
  },
] satisfies readonly HostedAppDefinition[];
