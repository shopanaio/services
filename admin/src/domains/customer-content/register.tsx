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
      sidebar: {
        label: "All Reviews",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/customer-content/reviews/page/page"),
      ),
    },
    {
      key: "customer-reviews-moderation",
      path: "/:orgName/:storeName/customer-content/reviews/moderation",
      disabled: true,
      sidebar: {
        label: "Moderation",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/customer-content/moderation/page/page"),
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
      disabled: true,
      sidebar: {
        label: "All Questions",
        icon: null,
        order: 1,
      },
      component: dynamic(
        () => import("@/domains/customer-content/questions/page/page"),
      ),
    },
    {
      key: "customer-questions-moderation",
      path: "/:orgName/:storeName/customer-content/questions/moderation",
      disabled: true,
      sidebar: {
        label: "Moderation",
        icon: null,
        order: 2,
      },
      component: dynamic(
        () => import("@/domains/customer-content/moderation/page/page"),
      ),
    },
  ],
});
