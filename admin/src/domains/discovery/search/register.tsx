import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "search",
  domain: "discovery",
  sidebar: {
    label: "Search",
    icon: null,
    order: 6,
  },
  items: [
    {
      key: "search-page",
      path: "/:orgName/:storeName/search",
      component: dynamic(() => import("@/domains/discovery/search/page/page")),
    },
  ],
});
