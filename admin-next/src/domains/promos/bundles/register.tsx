import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "bundles",
  domain: "promos",
  sidebar: {
    label: "Bundles",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "bundles-list",
      path: "/:orgName/:storeName/bundles",
      component: dynamic(
        () => import("@/domains/promos/bundles/page/page"),
      ),
    },
  ],
});
