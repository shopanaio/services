import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "customer-reviews",
  domain: "customer-content",
  sidebar: {
    label: "Reviews",
    icon: null,
    order: 1,
  },
  items: [
    {
      key: "customer-reviews-list",
      path: "/:orgName/:storeName/customer-content/reviews",
      component: dynamic(
        () => import("@/domains/customer-content/reviews/page/page"),
      ),
    },
  ],
});

registerModule({
  key: "customer-questions",
  domain: "customer-content",
  sidebar: {
    label: "Questions",
    icon: null,
    order: 2,
  },
  items: [
    {
      key: "customer-questions-list",
      path: "/:orgName/:storeName/customer-content/questions",
      component: dynamic(
        () => import("@/domains/customer-content/questions/page/page"),
      ),
    },
  ],
});
