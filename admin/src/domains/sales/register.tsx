import { registerModule } from "@/registry";
import { LuShoppingCart as ShoppingCartOutlined } from "react-icons/lu";
import dynamic from "next/dynamic";

registerModule({
  key: "sales-orders",
  domain: "store",
  sidebar: {
    label: "Sales",
    icon: <ShoppingCartOutlined />,
    order: 6,
  },
  items: [
    {
      key: "all-orders-list",
      path: "/:orgName/:storeName/orders",
      sidebar: {
        label: "Orders",
        icon: null,
        order: 1,
      },
      component: dynamic(() => import("@/domains/sales/all-orders/page/page")),
    },
    {
      key: "draft-orders-list",
      path: "/:orgName/:storeName/orders/drafts",
      disabled: true,
      sidebar: {
        label: "Draft Orders",
        icon: null,
        order: 2,
      },
      component: dynamic(() => import("@/domains/sales/draft-orders/page/page")),
    },
    {
      key: "abandoned-checkouts-list",
      path: "/:orgName/:storeName/orders/abandoned-checkouts",
      disabled: true,
      sidebar: {
        label: "Abandoned Checkouts",
        icon: null,
        order: 3,
      },
      component: dynamic(() => import("@/domains/sales/abandoned-checkouts/page/page")),
    },
    {
      key: "fulfillment-page",
      path: "/:orgName/:storeName/fulfillment",
      sidebar: {
        label: "Fulfillment",
        icon: null,
        order: 4,
      },
      component: dynamic(() => import("@/domains/sales/fulfillment/board/page/page")),
    },
  ],
});
