import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { UserOutlined } from "@ant-design/icons";

registerModule({
  key: "profile",
  domain: "workspace",
  sidebar: {
    label: "Account",
    icon: <UserOutlined />,
    order: 2,
  },
  items: [
    {
      key: "profile",
      path: "/workspace/profile",
      component: dynamic(
        () => import("@/domains/workspace/profile/page/profile-page")
      ),
    },
  ],
});
