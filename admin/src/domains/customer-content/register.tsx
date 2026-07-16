import { registerModule } from "@/registry";
import { NotificationOutlined } from "@ant-design/icons";
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
      key: "customer-reviews-list",
      path: "/:orgName/:storeName/customer-content/reviews",
      sidebar: {
        label: "Reviews",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/customer-content/reviews/page/page"),
      ),
    },
    {
      key: "customer-questions-list",
      path: "/:orgName/:storeName/customer-content/questions",
      sidebar: {
        label: "Q&A",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/customer-content/questions/page/page"),
      ),
    },
    {
      key: "customer-content-moderation",
      path: "/:orgName/:storeName/customer-content/moderation",
      sidebar: { label: "Moderation", icon: null, order: 3 },
      component: dynamic(() => import("@/domains/customer-content/management/moderation/page")),
    },
    {
      key: "customer-content-reports",
      path: "/:orgName/:storeName/customer-content/reports",
      sidebar: { label: "Reports", icon: null, order: 4 },
      component: dynamic(() => import("@/domains/customer-content/management/reports/page")),
    },
    {
      key: "customer-content-cases",
      path: "/:orgName/:storeName/customer-content/cases",
      sidebar: { label: "Cases", icon: null, order: 5 },
      component: dynamic(() => import("@/domains/customer-content/management/cases/page")),
    },
    {
      key: "review-requests",
      path: "/:orgName/:storeName/customer-content/review-requests",
      sidebar: { label: "Review requests", icon: null, order: 6 },
      component: dynamic(() => import("@/domains/customer-content/management/requests/page")),
    },
    {
      key: "review-rating-criteria",
      path: "/:orgName/:storeName/customer-content/rating-criteria",
      sidebar: { label: "Rating criteria", icon: null, order: 7 },
      component: dynamic(() => import("@/domains/customer-content/management/criteria/page")),
    },
    {
      key: "review-external-sync",
      path: "/:orgName/:storeName/customer-content/external-sync",
      sidebar: { label: "External sync", icon: null, order: 8 },
      component: dynamic(() => import("@/domains/customer-content/management/external/page")),
    },
    {
      key: "customer-content-insights",
      path: "/:orgName/:storeName/customer-content/insights",
      sidebar: { label: "Product insights", icon: null, order: 9 },
      component: dynamic(() => import("@/domains/customer-content/management/insights/page")),
    },
    {
      key: "review-settings",
      path: "/:orgName/:storeName/customer-content/settings",
      sidebar: { label: "Settings", icon: null, order: 10 },
      component: dynamic(() => import("@/domains/customer-content/management/settings/page")),
    },
    {
      key: "discounts-list",
      path: "/:orgName/:storeName/discounts",
      disabled: true,
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
