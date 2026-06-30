import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { AppstoreOutlined, ShopOutlined } from "@ant-design/icons";
import { InventorySidebarConfigLoader } from "./components/inventory-sidebar-config-loader";

registerDomain({
  key: "store",
  layout: AppLayout,
  sidebar: {
    label: "Store",
    icon: <ShopOutlined />,
    order: 1,
  },
});

registerDomain({
  key: "inventory",
  layout: AppLayout,
  sidebar: {
    label: "Inventory",
    icon: <AppstoreOutlined />,
    order: 2,
  },
  sidebarRuntime: InventorySidebarConfigLoader,
});
