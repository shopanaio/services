import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { TeamOutlined } from "@ant-design/icons";

registerDomain({
  key: "customers",
  layout: AppLayout,
  sidebar: {
    label: "Customers",
    icon: <TeamOutlined />,
    order: 4,
  },
});
