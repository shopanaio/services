import { registerDomain } from "@/registry";
import { SettingOutlined } from "@ant-design/icons";

registerDomain({
  key: "workspace",
  label: "Workspace",
  icon: <SettingOutlined />,
  order: 10,
});
