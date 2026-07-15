import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "customer-reviews",
  domain: "store",
  sidebar: {
    label: "Marketing",
    icon: null,
    order: 9,
  },
  items: [
    {
      key: "customer-reviews-list",
      path: "/:orgName/:storeName/customer-content/reviews",
      sidebar: {
        label: "Review",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/customer-content/reviews/page/page"),
      ),
    },
    {
      key: "customer-questions-list",
      path: "/:orgName/:storeName/customer-content/questions",
      sidebar: {
        label: "Q&A",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/customer-content/questions/page/page"),
      ),
    },
  ],
});
