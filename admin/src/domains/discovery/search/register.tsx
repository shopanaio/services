import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "search",
  domain: "discovery",
  sidebar: {
    label: "Search",
    icon: null,
    order: 5,
  },
  items: [
    {
      key: "search-product-boosts",
      path: "/:orgName/:storeName/search/product-boosts",
      component: dynamic(
        () => import("@/domains/discovery/search/product-boosts/page/page"),
      ),
      sidebar: {
        label: "Product boosts",
        order: 1,
      },
    },
    {
      key: "search-synonyms",
      path: "/:orgName/:storeName/search/synonyms",
      component: dynamic(
        () => import("@/domains/discovery/search/synonyms/page/page"),
      ),
      sidebar: {
        label: "Synonyms",
        order: 2,
      },
    },
  ],
});
