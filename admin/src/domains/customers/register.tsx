import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "all-customers",
  domain: "customers",
  sidebar: {
    label: "All Customers",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "all-customers-list",
      path: "/:orgName/:storeName/customers",
      component: dynamic(
        () => import("@/domains/customers/all-customers/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "customer-segments",
  domain: "customers",
  sidebar: {
    label: "Segments",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "customer-segments-list",
      path: "/:orgName/:storeName/customers/segments",
      disabled: true,
      component: dynamic(
        () => import("@/domains/customers/segments/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "customer-loyalty",
  domain: "customers",
  sidebar: {
    label: "Loyalty",
    icon: null,
    order: 3,
  },
  items: [
    {
      key: "loyalty-programs-list",
      path: "/:orgName/:storeName/customers/loyalty/programs",
      disabled: true,
      sidebar: {
        label: "Programs",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/customers/loyalty-programs/page/page"),
      ),
    },
    {
      key: "loyalty-rewards-list",
      path: "/:orgName/:storeName/customers/loyalty/rewards",
      disabled: true,
      sidebar: {
        label: "Rewards",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/customers/loyalty-rewards/page/page"),
      ),
    },
    {
      key: "loyalty-tiers-list",
      path: "/:orgName/:storeName/customers/loyalty/tiers",
      disabled: true,
      sidebar: {
        label: "Tiers",
        icon: null,
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/customers/loyalty-tiers/page/page"),
      ),
    },
  ],
});
