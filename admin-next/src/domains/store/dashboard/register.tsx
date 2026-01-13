import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { DashboardOutlined } from "@ant-design/icons";

registerModule({
  key: "store-dashboard",
  domain: "store",
  sidebar: {
    label: "Dashboard",
    icon: <DashboardOutlined />,
    order: 0,
  },
  items: [
    {
      key: "store-dashboard",
      path: "/:orgName/:storeName",
      component: dynamic(
        () => import("@/domains/store/dashboard/page/dashboard-page")
      ),
    },
  ],
});
