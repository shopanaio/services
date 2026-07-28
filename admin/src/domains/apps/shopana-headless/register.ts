import { registerLocalAdminApp } from "../runtime/local-app-registry";

registerLocalAdminApp(
  {
    appCode: "shopana-headless",
    remoteName: "shopana_headless_admin",
    pageModule: "./Page",
  },
  () => import("./src/page"),
);
