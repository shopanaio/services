import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { PictureOutlined } from "@ant-design/icons";

registerDomain({
  key: "media",
  layout: AppLayout,
  sidebar: {
    label: "Media",
    icon: <PictureOutlined />,
    order: 2,
  },
});
