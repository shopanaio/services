import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "stock",
  domain: "inventory",
  items: [
    {
      key: "stock-list",
      path: "/:orgName/:storeName/inventory",
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
