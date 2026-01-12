import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { TeamOutlined } from "@ant-design/icons";

registerModule({
  key: "team",
  domain: "workspace",
  sidebar: {
    label: "Team",
    icon: <TeamOutlined />,
    order: 3,
  },
  items: [
    {
      key: "team-members",
      path: "/workspace/team",
      component: dynamic(
        () => import("@/domains/workspace/team/page/members-page")
      ),
      sidebar: {
        label: "Members",
        order: 1,
      },
    },
    {
      key: "team-roles",
      path: "/workspace/roles",
      component: dynamic(
        () => import("@/domains/workspace/team/page/roles-page")
      ),
      sidebar: {
        label: "Roles",
        order: 2,
      },
    },
  ],
});
