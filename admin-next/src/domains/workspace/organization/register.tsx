import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { BankOutlined } from "@ant-design/icons";

registerModule({
  key: "organization",
  domain: "workspace",
  sidebar: {
    label: "Organization",
    icon: <BankOutlined />,
    order: 1,
  },
  items: [
    {
      key: "organization-general",
      path: "/workspace/organization",
      component: dynamic(
        () => import("@/domains/workspace/organization/page/organization-page")
      ),
      sidebar: {
        label: "General",
        order: 1,
      },
    },
    {
      key: "organization-members",
      path: "/workspace/team",
      component: dynamic(
        () => import("@/domains/workspace/team/page/members-page")
      ),
      sidebar: {
        label: "Members",
        order: 2,
      },
    },
    {
      key: "organization-roles",
      path: "/workspace/roles",
      component: dynamic(
        () => import("@/domains/workspace/team/page/roles-page")
      ),
      sidebar: {
        label: "Roles",
        order: 3,
      },
    },
  ],
});
