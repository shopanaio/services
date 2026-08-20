import { registerModule } from "@/registry";
import { LuUsers as TeamOutlined } from "react-icons/lu";
import dynamic from "next/dynamic";

registerModule({
  key: "all-customers",
  domain: "store",
  sidebar: {
    label: "Customers",
    icon: <TeamOutlined />,
    order: 8,
  },
  items: [
    {
      key: "all-customers-list",
      path: "/:orgName/:storeName/customers",
      sidebar: {
        label: "All customers",
        icon: null,
        order: 1,
      },
      component: dynamic(() => import("@/domains/customers/all-customers/page/page")),
    },
    {
      key: "customer-groups-list",
      path: "/:orgName/:storeName/customers/groups",
      sidebar: { label: "Groups", icon: null, order: 2 },
      component: dynamic(() => import("@/domains/customers/groups/page/page")),
    },
    {
      key: "customer-segments-list",
      path: "/:orgName/:storeName/customers/segments",
      sidebar: {
        label: "Segments",
        icon: null,
        order: 3,
      },
      component: dynamic(() => import("@/domains/customers/segments/page/page")),
    },
    {
      key: "customer-tags-list",
      path: "/:orgName/:storeName/customers/tags",
      sidebar: { label: "Tags", icon: null, order: 4 },
      component: dynamic(() => import("@/domains/customers/tags/page/page")),
    },
    {
      key: "loyalty-programs-list",
      path: "/:orgName/:storeName/customers/loyalty/programs",
      disabled: true,
      sidebar: {
        label: "Loyalty",
        icon: null,
        order: 5,
      },
      component: dynamic(() => import("@/domains/customers/loyalty-programs/page/page")),
    },
    {
      key: "loyalty-rewards-list",
      path: "/:orgName/:storeName/customers/loyalty/rewards",
      disabled: true,
      component: dynamic(() => import("@/domains/customers/loyalty-rewards/page/page")),
    },
    {
      key: "loyalty-tiers-list",
      path: "/:orgName/:storeName/customers/loyalty/tiers",
      disabled: true,
      component: dynamic(() => import("@/domains/customers/loyalty-tiers/page/page")),
    },
  ],
});
