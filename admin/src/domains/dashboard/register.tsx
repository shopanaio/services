import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { LuLayoutDashboard } from "react-icons/lu";

registerModule({
  key: "dashboard",
  domain: "store",
  sidebar: {
    label: "Dashboard",
    icon: <LuLayoutDashboard />,
    order: 1,
  },
  items: [
    {
      key: "dashboard",
      path: "/:orgName/:storeName/dashboard",
      disabled: true,
      component: dynamic(() => import("@/domains/dashboard/page/page")),
    },
  ],
});
