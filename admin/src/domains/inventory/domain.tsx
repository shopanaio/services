import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { LuStore as ShopOutlined } from "react-icons/lu";
import { InventorySidebarConfigLoader } from "./components/inventory-sidebar-config-loader";

registerDomain({
  key: "store",
  layout: AppLayout,
  sidebar: {
    label: "Store",
    icon: <ShopOutlined />,
    order: 1,
  },
  sidebarRuntime: InventorySidebarConfigLoader,
});
