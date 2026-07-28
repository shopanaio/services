import { registerLocalAdminApp } from "../runtime/local-app-registry";

registerLocalAdminApp(
  {
    appCode: "shopana-online-store",
    remoteName: "shopana_online_store_admin",
    pageModule: "./Page",
  },
  () => import("./src/page"),
);
