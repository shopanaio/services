import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "sales-orders",
  domain: "sales",
  sidebar: {
    label: "Orders",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "all-orders-list",
      path: "/:orgName/:storeName/orders",
      sidebar: {
        label: "All Orders",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/sales/all-orders/page/page"),
      ),
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
      component: dynamic(
        () => import("@/domains/sales/draft-orders/page/page"),
      ),
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
      component: dynamic(
        () => import("@/domains/sales/abandoned-checkouts/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "sales-fulfillment",
  domain: "sales",
  sidebar: {
    label: "Fulfillment",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "fulfillment-page",
      path: "/:orgName/:storeName/fulfillment",
      component: dynamic(
        () => import("@/domains/sales/fulfillment/board/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "sales-returns",
  domain: "sales",
  sidebar: {
    label: "Returns",
    icon: null,
    order: 3,
  },
  items: [
    {
      key: "return-requests-list",
      path: "/:orgName/:storeName/returns/requests",
      disabled: true,
      sidebar: {
        label: "Return Requests",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/sales/return-requests/page/page"),
      ),
    },
    {
      key: "exchanges-list",
      path: "/:orgName/:storeName/returns/exchanges",
      disabled: true,
      sidebar: {
        label: "Exchanges",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/sales/exchanges/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "sales-payments",
  domain: "sales",
  sidebar: {
    label: "Payments",
    icon: null,
    order: 4,
  },
  items: [
    {
      key: "transactions-list",
      path: "/:orgName/:storeName/payments/transactions",
      disabled: true,
      sidebar: {
        label: "Transactions",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/sales/transactions/page/page"),
      ),
    },
    {
      key: "refunds-list",
      path: "/:orgName/:storeName/payments/refunds",
      disabled: true,
      sidebar: {
        label: "Refunds",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/sales/refunds/page/page"),
      ),
    },
  ],
});
