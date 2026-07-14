import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "locations",
  domain: "inventory",
  sidebar: {
    label: "Locations",
    icon: null,
    order: 2,
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
