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
      key: "discounts-list",
      path: "/:orgName/:storeName/discounts",
      disabled: true,
      sidebar: {
        label: "Discounts",
        icon: null,
        order: 3,
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
        order: 4,
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
        order: 5,
      },
      component: dynamic(
        () => import("@/domains/inventory/campaigns/page/page"),
      ),
    },
  ],
});
