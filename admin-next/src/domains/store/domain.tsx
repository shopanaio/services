import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { ShopOutlined } from "@ant-design/icons";

registerDomain({
  key: "store",
  layout: AppLayout,
  sidebar: {
    label: "Store",
    icon: <ShopOutlined />,
    order: 0,
  },
});
