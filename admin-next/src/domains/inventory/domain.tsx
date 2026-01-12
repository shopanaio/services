import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { ShoppingOutlined } from "@ant-design/icons";

registerDomain({
  key: "inventory",
  layout: AppLayout,
  sidebar: {
    label: "Inventory",
    icon: <ShoppingOutlined />,
    order: 1,
  },
});
