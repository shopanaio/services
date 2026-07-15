import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "storefront",
  domain: "store",
  sidebar: {
    label: "Storefront",
    icon: null,
    order: 10,
  },
  items: [
    {
      key: "website-pages-list",
      path: "/:orgName/:storeName/pages",
      disabled: true,
      sidebar: {
        label: "Pages",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/media/website-pages/page/page"),
      ),
    },
    {
      key: "website-navigation-list",
      path: "/:orgName/:storeName/navigation",
      sidebar: {
        label: "Navigation",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/media/navigation/page/page"),
      ),
    },
    {
      key: "search-product-boosts",
      path: "/:orgName/:storeName/search/product-boosts",
      sidebar: {
        label: "Product boosts",
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/discovery/search/product-boosts/page/page"),
      ),
    },
    {
      key: "search-synonyms",
      path: "/:orgName/:storeName/search/synonyms",
      sidebar: {
        label: "Synonyms",
        order: 4,
      },
      component: dynamic(
        () => import("@/domains/discovery/search/synonyms/page/page"),
      ),
    },
    {
      key: "facets-list",
      path: "/:orgName/:storeName/facets",
      sidebar: {
        label: "Filters",
        icon: null,
        order: 5,
      },
      component: dynamic(() => import("@/domains/discovery/facets/page/page")),
    },
    {
      key: "files-list",
      path: "/:orgName/:storeName/files",
      sidebar: {
        label: "Media",
        icon: null,
        order: 6,
      },
      component: dynamic(() => import("@/domains/media/page/page")),
    },
    {
      key: "search-settings",
      path: "/:orgName/:storeName/search/settings",
      sidebar: {
        label: "Settings",
        icon: null,
        order: 7,
      },
      component: dynamic(
        () => import("@/domains/discovery/search/settings/page/page"),
      ),
    },
  ],
});
