import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "tags",
  domain: "store",
  sidebar: {
    label: "Tags",
    icon: null,
    order: 4,
  },
  items: [
    {
      key: "tags-list",
      path: "/:orgName/:storeName/tags",
      component: dynamic(
        () => import("@/domains/inventory/tags/page/page"),
      ),
    },
  ],
});
