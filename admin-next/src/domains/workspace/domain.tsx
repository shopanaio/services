import { registerDomain } from "@/registry";
import { SettingOutlined } from "@ant-design/icons";
import { AppDomainLayout } from "@/layouts/app/components/layout/app-domain-layout";

registerDomain({
  key: "workspace",
  layout: AppDomainLayout,
  sidebar: {
    label: "Workspace",
    icon: <SettingOutlined />,
    order: 10,
  },
});
