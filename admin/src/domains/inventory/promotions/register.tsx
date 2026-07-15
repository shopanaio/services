import { registerModule } from "@/registry";
import { PercentageOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";

registerModule({
  key: "promotions",
  domain: "store",
  sidebar: {
    label: "Promotions",
    icon: <PercentageOutlined />,
    order: 4,
  },
  items: [
    {
      key: "discounts-list",
      path: "/:orgName/:storeName/discounts",
      disabled: true,
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
      disabled: true,
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
      disabled: true,
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
