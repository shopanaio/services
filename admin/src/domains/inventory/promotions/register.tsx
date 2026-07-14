import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "promotions",
  domain: "store",
  sidebar: {
    label: "Promotions",
    icon: null,
    order: 4,
  },
  items: [
    {
      key: "discounts-list",
      path: "/:orgName/:storeName/discounts",
      sidebar: {
        label: "Discounts",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/inventory/discounts/page/page"),
      ),
    },
    {
      key: "coupons-list",
      path: "/:orgName/:storeName/coupons",
      sidebar: {
        label: "Coupons",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/inventory/coupons/page/page"),
      ),
    },
    {
      key: "campaigns-list",
      path: "/:orgName/:storeName/campaigns",
      sidebar: {
        label: "Campaigns",
        icon: null,
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/inventory/campaigns/page/page"),
      ),
    },
  ],
});
