import { registerLocalAdminApp } from "../runtime/local-app-registry";

registerLocalAdminApp(
  {
    appCode: "shopana-smtp",
    remoteName: "shopana_smtp_admin",
    pageModule: "./Page",
  },
  () => import("./src/page"),
);
