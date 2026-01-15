import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { ShoppingOutlined } from "@ant-design/icons";

registerModule({
  key: "stock",
  domain: "inventory",
  sidebar: {
    label: "Inventory",
    icon: <ShoppingOutlined />,
    order: 2,
  },
  items: [
    {
      key: "stock-list",
      path: "/:orgName/:storeName/inventory",
      component: dynamic(
        () => import("@/domains/inventory/inventory/page/page")
      ),
    },
  ],
});
