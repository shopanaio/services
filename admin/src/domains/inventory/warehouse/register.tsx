import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "warehouse",
  domain: "inventory",
  sidebar: {
    label: "Warehouse",
    icon: null,
    order: 1000,
  },
  items: [
    {
      key: "warehouse-list",
      path: "/:orgName/:storeName/warehouses",
      component: dynamic(
        () => import("@/domains/inventory/warehouse/page/page"),
      ),
    },
  ],
});
