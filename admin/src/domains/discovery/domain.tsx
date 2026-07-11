import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { CompassOutlined } from "@ant-design/icons";

registerDomain({
  key: "discovery",
  layout: AppLayout,
  sidebar: {
    label: "Discovery",
    icon: <CompassOutlined />,
    order: 3,
  },
});
