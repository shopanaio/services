import helloWorld from "@shopana/app-hello-world";
import onlineStore from "@shopana/app-online-store";
import headless from "@shopana/app-headless";
import smtp from "@shopana/app-smtp";
import testFedex from "@shopana/app-test-fedex";
import testStripe from "@shopana/app-test-stripe";
import testTwilio from "@shopana/app-test-twilio";
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
  {
    definition: testFedex,
    moduleUrl: import.meta.resolve("@shopana/app-test-fedex"),
  },
  {
    definition: testStripe,
    moduleUrl: import.meta.resolve("@shopana/app-test-stripe"),
  },
  {
    definition: testTwilio,
    moduleUrl: import.meta.resolve("@shopana/app-test-twilio"),
  },
] satisfies readonly HostedAppDefinition[];
