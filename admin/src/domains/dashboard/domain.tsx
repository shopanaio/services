import { registerDomain } from "@/registry";
import { DashboardOutlined } from "@ant-design/icons";

registerDomain({
  key: "dashboard",
  label: "Dashboard",
  icon: <DashboardOutlined />,
  order: 0,
});
