import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "stock",
  domain: "inventory",
  sidebar: {
    label: "Stock",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "stock-list",
      path: "/:orgName/:storeName/inventory",
      sidebar: {
        label: "All Stock",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/inventory/inventory/page/page")
      ),
    },
    {
      key: "stock-warehouse",
      path: "/:orgName/:storeName/inventory/:warehouseId",
      component: dynamic(
        () => import("@/domains/inventory/inventory/page/page")
      ),
    },
  ],
});
