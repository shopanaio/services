import { registerDomain } from "@/registry";
import { LoginOutlined } from "@ant-design/icons";

registerDomain({
  key: "auth",
  label: "Auth",
  icon: <LoginOutlined />,
  order: 0,
});
