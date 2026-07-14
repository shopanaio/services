import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { SettingOutlined } from "@ant-design/icons";

registerDomain({
  key: "system",
  layout: AppLayout,
  sidebar: {
    label: "System",
    icon: <SettingOutlined />,
    order: 9,
  },
});
