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
      key: "profile-settings",
      path: "/workspace/profile",
      component: dynamic(
        () => import("@/domains/workspace/profile/page/profile-page")
      ),
      sidebar: {
        label: "Profile",
        order: 1,
      },
    },
    {
      key: "profile-security",
      path: "/workspace/security",
      component: dynamic(
        () => import("@/domains/workspace/profile/page/security-page")
      ),
      sidebar: {
        label: "Security",
        order: 2,
      },
    },
  ],
});
