import { registerModule } from "@/registry";
import { LuGift as GiftOutlined } from "react-icons/lu";
import dynamic from "next/dynamic";

registerModule({
  key: "merchandising",
  domain: "store",
  sidebar: {
    label: "Merchandising",
    icon: <GiftOutlined />,
    order: 3,
  },
  items: [
    {
      key: "badges-list",
      path: "/:orgName/:storeName/badges",
      disabled: true,
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
      disabled: true,
      sidebar: {
        label: "Featured products",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/inventory/featured-products/page/page"),
      ),
    },
  ],
});
