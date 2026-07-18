import { registerModule } from "@/registry";
import { LuBell as NotificationOutlined } from "react-icons/lu";
import dynamic from "next/dynamic";

registerModule({
  key: "marketing",
  domain: "store",
  sidebar: {
    label: "Marketing",
    icon: <NotificationOutlined />,
    order: 9,
  },
  items: [
    {
      key: "customer-content",
      path: "/:orgName/:storeName/customer-content",
      sidebar: {
        label: "UGC",
        icon: null,
        order: 1,
        activePaths: [
          "/:orgName/:storeName/customer-content/reviews",
          "/:orgName/:storeName/customer-content/questions",
          "/:orgName/:storeName/customer-content/moderation",
          "/:orgName/:storeName/customer-content/reports",
          "/:orgName/:storeName/customer-content/cases",
          "/:orgName/:storeName/customer-content/review-requests",
          "/:orgName/:storeName/customer-content/external-sync",
          "/:orgName/:storeName/customer-content/settings",
        ],
      },
      component: dynamic(() => import("@/domains/customer-content/page/page")),
    },
    {
      key: "customer-reviews-list",
      path: "/:orgName/:storeName/customer-content/reviews",
      component: dynamic(
        () => import("@/domains/customer-content/reviews/page/page"),
      ),
    },
    {
      key: "customer-questions-list",
      path: "/:orgName/:storeName/customer-content/questions",
      component: dynamic(
        () => import("@/domains/customer-content/questions/page/page"),
      ),
    },
    {
      key: "customer-content-moderation",
      path: "/:orgName/:storeName/customer-content/moderation",
      component: dynamic(() => import("@/domains/customer-content/management/moderation/page")),
    },
    {
      key: "customer-content-reports",
      path: "/:orgName/:storeName/customer-content/reports",
      component: dynamic(() => import("@/domains/customer-content/management/reports/page")),
    },
    {
      key: "customer-content-cases",
      path: "/:orgName/:storeName/customer-content/cases",
      component: dynamic(() => import("@/domains/customer-content/management/cases/page")),
    },
    {
      key: "review-requests",
      path: "/:orgName/:storeName/customer-content/review-requests",
      component: dynamic(() => import("@/domains/customer-content/management/requests/page")),
    },
    {
      key: "review-external-sync",
      path: "/:orgName/:storeName/customer-content/external-sync",
      component: dynamic(() => import("@/domains/customer-content/management/external/page")),
    },
    {
      key: "review-settings",
      path: "/:orgName/:storeName/customer-content/settings",
      component: dynamic(() => import("@/domains/customer-content/management/settings/page")),
    },
    {
      key: "discounts-list",
      path: "/:orgName/:storeName/discounts",
      disabled: false,
      sidebar: {
        label: "Discounts",
        icon: null,
        order: 11,
      },
      component: dynamic(
        () => import("@/domains/inventory/discounts/page/page"),
      ),
    },
    {
      key: "coupons-list",
      path: "/:orgName/:storeName/coupons",
      disabled: true,
      sidebar: {
        label: "Coupons",
        icon: null,
        order: 12,
      },
      component: dynamic(
        () => import("@/domains/inventory/coupons/page/page"),
      ),
    },
    {
      key: "campaigns-list",
      path: "/:orgName/:storeName/campaigns",
      disabled: true,
      sidebar: {
        label: "Campaigns",
        icon: null,
        order: 13,
      },
      component: dynamic(
        () => import("@/domains/inventory/campaigns/page/page"),
      ),
    },
  ],
});
