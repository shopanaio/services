import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { ShoppingOutlined } from "@ant-design/icons";

registerModule({
  key: "products",
  domain: "inventory",
  sidebar: {
    label: "Products",
    icon: <ShoppingOutlined />,
    order: 1,
  },
  items: [
    {
      key: "products-list",
      path: "/products",
      component: dynamic(() => import("@/domains/inventory/products/page/page")),
      sidebar: {
        label: "All Products",
        order: 1,
      },
    },
  ],
});
