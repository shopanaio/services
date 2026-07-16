import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { LuLandmark as BankOutlined } from "react-icons/lu";

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
      key: "organization",
      path: "/workspace/:orgName",
      component: dynamic(
        () => import("@/domains/workspace/organization/page/organization-page")
      ),
    },
  ],
});
