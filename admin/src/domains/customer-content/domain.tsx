import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { MessageOutlined } from "@ant-design/icons";

registerDomain({
  key: "customer-content",
  layout: AppLayout,
  sidebar: {
    label: "Customer Content",
    icon: <MessageOutlined />,
    order: 5,
  },
});
