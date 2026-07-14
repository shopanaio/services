import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "discovery-settings",
  domain: "discovery",
  sidebar: {
    label: "Settings",
    icon: null,
    order: 7,
  },
  items: [
    {
      key: "search-settings",
      path: "/:orgName/:storeName/search/settings",
      component: dynamic(
        () => import("@/domains/discovery/search/settings/page/page"),
      ),
    },
  ],
});
