import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { LuUser as UserOutlined } from "react-icons/lu";

registerModule({
  key: "profile",
  domain: "profile",
  sidebar: {
    label: "Account",
    icon: <UserOutlined />,
    order: 2,
  },
  items: [
    {
      key: "profile",
      path: "/profile",
      component: dynamic(() => import("@/domains/profile/page/profile-page")),
    },
  ],
});
