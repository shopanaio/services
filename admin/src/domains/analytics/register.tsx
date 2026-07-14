import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "analytics-reports",
  domain: "analytics",
  sidebar: {
    label: "Reports",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "sales-reports",
      path: "/:orgName/:storeName/analytics/reports/sales",
      sidebar: {
        label: "Sales",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/analytics/sales-reports/page/page"),
      ),
    },
    {
      key: "product-reports",
      path: "/:orgName/:storeName/analytics/reports/products",
      sidebar: {
        label: "Products",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/analytics/product-reports/page/page"),
      ),
    },
    {
      key: "customer-reports",
      path: "/:orgName/:storeName/analytics/reports/customers",
      sidebar: {
        label: "Customers",
        icon: null,
        order: 3,
      },
      component: dynamic(
        () => import("@/domains/analytics/customer-reports/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "analytics-performance",
  domain: "analytics",
  sidebar: {
    label: "Performance",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "conversion-performance",
      path: "/:orgName/:storeName/analytics/performance/conversion",
      sidebar: {
        label: "Conversion",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/analytics/conversion/page/page"),
      ),
    },
    {
      key: "search-performance",
      path: "/:orgName/:storeName/analytics/performance/search",
      sidebar: {
        label: "Search",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/analytics/search-performance/page/page"),
      ),
    },
  ],
});
