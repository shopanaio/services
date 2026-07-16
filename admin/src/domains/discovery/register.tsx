import { registerModule } from "@/registry";
import { LuFileText as FileTextOutlined } from "react-icons/lu";
import dynamic from "next/dynamic";
import { LuSearch } from "react-icons/lu";

registerModule({
  key: "search-discovery",
  domain: "store",
  sidebar: {
    label: "Search & Discovery",
    icon: <LuSearch />,
    order: 10,
  },
  items: [
    {
      key: "search",
      path: "/:orgName/:storeName/search",
      sidebar: {
        label: "Search",
        order: 1,
        activePaths: [
          "/:orgName/:storeName/search/product-boosts",
          "/:orgName/:storeName/search/synonyms",
        ],
      },
      component: dynamic(
        () => import("@/domains/discovery/search/page/page"),
      ),
    },
    {
      key: "search-product-boosts",
      path: "/:orgName/:storeName/search/product-boosts",
      component: dynamic(
        () => import("@/domains/discovery/search/product-boosts/page/page"),
      ),
    },
    {
      key: "search-synonyms",
      path: "/:orgName/:storeName/search/synonyms",
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
        order: 2,
      },
      component: dynamic(() => import("@/domains/discovery/facets/page/page")),
    },
    {
      key: "recommendations",
      path: "/:orgName/:storeName/search/recommendations",
      disabled: true,
      sidebar: {
        label: "Recommendations",
        icon: null,
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/discovery/recommendations/page/page"),
      ),
    },
    {
      key: "search-settings",
      path: "/:orgName/:storeName/search/settings",
      sidebar: {
        label: "Preferences",
        icon: null,
        order: 4,
      },
      component: dynamic(
        () => import("@/domains/discovery/search/settings/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "storefront",
  domain: "store",
  sidebar: {
    label: "Content",
    icon: <FileTextOutlined />,
    order: 11,
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
      key: "files-list",
      path: "/:orgName/:storeName/files",
      sidebar: {
        label: "Media",
        icon: null,
        order: 3,
      },
      component: dynamic(() => import("@/domains/media/page/page")),
    },
  ],
});
