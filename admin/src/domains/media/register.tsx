import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "website-pages",
  domain: "website",
  sidebar: {
    label: "Pages",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "website-pages-list",
      path: "/:orgName/:storeName/pages",
      disabled: true,
      component: dynamic(
        () => import("@/domains/media/website-pages/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "website-navigation",
  domain: "website",
  sidebar: {
    label: "Navigation",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "website-navigation-list",
      path: "/:orgName/:storeName/navigation",
      disabled: true,
      component: dynamic(
        () => import("@/domains/media/navigation/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "website-media",
  domain: "website",
  sidebar: {
    label: "Media",
    icon: null,
    order: 3,
  },
  items: [
    {
      key: "files-list",
      path: "/:orgName/:storeName/files",
      component: dynamic(() => import("@/domains/media/page/page")),
    },
  ],
});
