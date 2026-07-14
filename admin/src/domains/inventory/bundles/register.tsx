import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "merchandising",
  domain: "store",
  sidebar: {
    label: "Merchandising",
    icon: null,
    order: 3,
  },
  items: [
    {
      key: "badges-list",
      path: "/:orgName/:storeName/badges",
      sidebar: {
        label: "Badges",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/inventory/badges/page/page"),
      ),
    },
    {
      key: "featured-products-list",
      path: "/:orgName/:storeName/featured-products",
      sidebar: {
        label: "Featured products",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/inventory/featured-products/page/page"),
      ),
    },
    {
      key: "bundles-list",
      path: "/:orgName/:storeName/bundles",
      sidebar: {
        label: "Bundles",
        icon: null,
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/inventory/bundles/page/page"),
      ),
    },
  ],
});
