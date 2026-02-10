import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "categories",
  domain: "store",
  sidebar: {
    label: "Categories",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "categories-list",
      path: "/:orgName/:storeName/categories",
      component: dynamic(
        () => import("@/domains/inventory/categories/page/page")
      ),
    },
  ],
});
