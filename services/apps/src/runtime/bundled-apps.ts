import helloWorld from "@shopana/app-hello-world";
import type { HostedAppDefinition } from "@shopana/app-runtime";

export const bundledApps = [
  {
    definition: helloWorld,
    moduleUrl: import.meta.resolve("@shopana/app-hello-world"),
  },
] satisfies readonly HostedAppDefinition[];
