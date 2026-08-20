import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { LuLayoutGrid as AppstoreOutlined } from "react-icons/lu";

registerModule({
  key: "organizations",
  domain: "workspace",
  sidebar: {
    label: "Organizations",
    icon: <AppstoreOutlined />,
    order: 0,
  },
  items: [
    {
      key: "organizations",
      path: "/workspace",
      component: dynamic(() => import("@/domains/workspace/organizations/page/organizations-page")),
    },
  ],
});
