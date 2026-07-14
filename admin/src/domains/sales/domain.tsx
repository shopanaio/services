import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { ShoppingCartOutlined } from "@ant-design/icons";

registerDomain({
  key: "sales",
  layout: AppLayout,
  sidebar: {
    label: "Sales",
    icon: <ShoppingCartOutlined />,
    order: 2,
  },
});
