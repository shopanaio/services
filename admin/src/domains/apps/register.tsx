import dynamic from "next/dynamic";
import { registerModule } from "@/registry";

registerModule({
  key: "admin-app-runtime",
  domain: "system",
  items: [
    {
      key: "admin-app-page",
      path: "/:orgName/:storeName/apps/:appCode{/*appPath}",
      component: dynamic(() => import("./runtime/app-runtime-page")),
    },
  ],
});
