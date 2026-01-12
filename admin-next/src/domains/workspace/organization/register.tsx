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
      key: "organization",
      path: "/workspace/organization",
      component: dynamic(
        () => import("@/domains/workspace/organization/page/organization-page")
      ),
    },
  ],
});
