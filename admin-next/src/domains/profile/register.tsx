import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { UserOutlined } from "@ant-design/icons";

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
      component: dynamic(
        () => import("@/domains/profile/page/profile-page")
      ),
    },
  ],
});
