import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { FolderOutlined } from "@ant-design/icons";

registerDomain({
  key: "media",
  layout: AppLayout,
  sidebar: {
    label: "Media",
    icon: <FolderOutlined />,
    order: 2,
  },
});
