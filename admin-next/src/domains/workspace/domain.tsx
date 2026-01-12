import { registerDomain } from "@/registry";
import { SettingOutlined } from "@ant-design/icons";
import { AppLayout } from "@/layouts/app/components/layout/layout";

registerDomain({
  key: "workspace",
  layout: AppLayout,
  sidebar: {
    label: "Workspace",
    icon: <SettingOutlined />,
    order: 10,
  },
});
