import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "stock",
  domain: "store",
  sidebar: {
    label: "Inventory",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "stock-list",
      path: "/:orgName/:storeName/inventory",
      component: dynamic(
        () => import("@/domains/inventory/inventory/page/page")
      ),
    },
  ],
});
