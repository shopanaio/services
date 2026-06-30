import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "products",
  domain: "store",
  sidebar: {
    label: "Products",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "products-list",
      path: "/:orgName/:storeName/products",
      component: dynamic(
        () => import("@/domains/inventory/products/page/page")
      ),
    },
  ],
});
