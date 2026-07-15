import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "stock",
  domain: "store",
  sidebar: {
    label: "Inventory",
    icon: null,
    order: 5,
  },
  items: [
    {
      key: "stock-list",
      path: "/:orgName/:storeName/inventory",
      sidebar: {
        label: "Stock",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/inventory/inventory/page/page")
      ),
    },
    {
      key: "warehouse-list",
      path: "/:orgName/:storeName/warehouses",
      sidebar: {
        label: "Locations",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/inventory/warehouse/page/page"),
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
