import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "facets",
  domain: "store",
  sidebar: {
    label: "Facets",
    icon: null,
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
