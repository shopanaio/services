import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { BarChartOutlined } from "@ant-design/icons";

registerDomain({
  key: "analytics",
  layout: AppLayout,
  sidebar: {
    label: "Analytics",
    icon: <BarChartOutlined />,
    order: 8,
  },
});
