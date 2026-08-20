import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { LuPackage } from "react-icons/lu";

registerModule({
  key: "catalog",
  domain: "store",
  sidebar: {
    label: "Catalog",
    icon: <LuPackage />,
    order: 2,
  },
  items: [
    {
      key: "products-list",
      path: "/:orgName/:storeName/products",
      sidebar: {
        label: "Products",
        icon: null,
        order: 1,
      },
      component: dynamic(() => import("@/domains/inventory/products/page/page")),
    },
    {
      key: "categories-list",
      path: "/:orgName/:storeName/categories",
      sidebar: {
        label: "Categories",
        icon: null,
        order: 2,
      },
      component: dynamic(() => import("@/domains/inventory/categories/page/page")),
    },
    {
      key: "tags-list",
      path: "/:orgName/:storeName/tags",
      sidebar: {
        label: "Tags",
        icon: null,
        order: 3,
      },
      component: dynamic(() => import("@/domains/inventory/tags/page/page")),
    },
  ],
});
