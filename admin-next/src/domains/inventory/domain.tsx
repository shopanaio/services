import { registerDomain } from "@/registry";
import { ShoppingOutlined } from "@ant-design/icons";
import { AppDomainLayout } from "@/layouts/app/components/layout/app-domain-layout";

registerDomain({
  key: "inventory",
  layout: AppDomainLayout,
  sidebar: {
    label: "Inventory",
    icon: <ShoppingOutlined />,
    order: 1,
  },
});
