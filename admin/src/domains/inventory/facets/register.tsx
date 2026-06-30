import { registerModule } from "@/registry";
import { FilterOutlined } from "@ant-design/icons";
import dynamic from "next/dynamic";

registerModule({
  key: "facets",
  domain: "store",
  sidebar: {
    label: "Facets",
    icon: <FilterOutlined />,
    order: 5,
  },
  items: [
    {
      key: "facets-list",
      path: "/:orgName/:storeName/facets",
      component: dynamic(() => import("@/domains/inventory/facets/page/page")),
    },
  ],
});
