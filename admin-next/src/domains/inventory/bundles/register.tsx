import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "bundles",
  domain: "store",
  sidebar: {
    label: "Bundles",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "bundles-list",
      path: "/:orgName/:storeName/bundles",
      component: dynamic(
        () => import("@/domains/inventory/bundles/page/page"),
      ),
    },
  ],
});
