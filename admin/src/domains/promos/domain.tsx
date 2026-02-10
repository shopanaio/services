import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { GiftOutlined } from "@ant-design/icons";

registerDomain({
  key: "promos",
  layout: AppLayout,
  sidebar: {
    label: "Promos",
    icon: <GiftOutlined />,
    order: 2,
  },
});
