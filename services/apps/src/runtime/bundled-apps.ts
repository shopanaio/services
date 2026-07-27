import helloWorld from "@shopana/app-hello-world";
import onlineStore from "@shopana/app-online-store";
import headless from "@shopana/app-headless";
import smtp from "@shopana/app-smtp";
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
  {
    definition: headless,
    moduleUrl: import.meta.resolve("@shopana/app-headless"),
  },
  {
    definition: smtp,
    moduleUrl: import.meta.resolve("@shopana/app-smtp"),
  },
] satisfies readonly HostedAppDefinition[];
