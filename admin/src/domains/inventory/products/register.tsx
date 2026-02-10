import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { ShoppingOutlined } from "@ant-design/icons";

registerModule({
  key: "products",
  domain: "store",
  sidebar: {
    label: "Products",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "products-list",
      path: "/:orgName/:storeName/products",
      component: dynamic(
        () => import("@/domains/inventory/products/page/page")
      ),
    },
  ],
});
