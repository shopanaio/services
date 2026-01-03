import { registerDomain } from "@/registry";
import { ShoppingOutlined } from "@ant-design/icons";

registerDomain({
  key: "inventory",
  label: "Inventory",
  icon: <ShoppingOutlined />,
  order: 1,
});
