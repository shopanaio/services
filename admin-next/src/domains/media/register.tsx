import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { FileOutlined } from "@ant-design/icons";

registerModule({
  key: "files",
  domain: "media",
  sidebar: {
    label: "Files",
    icon: <FileOutlined />,
    order: 1,
  },
  items: [
    {
      key: "files-list",
      path: "/:orgName/:storeName/files",
      component: dynamic(() => import("@/domains/media/page/page")),
    },
  ],
});
