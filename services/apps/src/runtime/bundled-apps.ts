import helloWorld from "@shopana/app-hello-world";
import type { ShopanaAppDefinition } from "@shopana/app-sdk";

export const bundledApps = [
  helloWorld,
] satisfies readonly ShopanaAppDefinition[];
