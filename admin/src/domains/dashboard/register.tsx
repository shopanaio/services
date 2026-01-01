import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { DashboardOutlined } from "@ant-design/icons";

registerModule({
  key: "dashboard",
  domain: "dashboard",
  sidebar: {
    label: "Dashboard",
    icon: <DashboardOutlined />,
    order: 0,
  },
  items: [
    {
      key: "dashboard-home",
      path: "/",
      component: dynamic(() => import("@/domains/dashboard/page/page")),
      sidebar: {
        label: "Overview",
        order: 0,
      },
    },
  ],
});
