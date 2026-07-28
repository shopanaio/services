import dynamic from "next/dynamic";
import { registerModule } from "@/registry";
import { LuBlocks } from "react-icons/lu";

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

registerModule({
  key: "admin-apps",
  domain: "system",
  sidebar: {
    label: "Apps",
    icon: <LuBlocks />,
    order: 0,
  },
  items: [],
});
