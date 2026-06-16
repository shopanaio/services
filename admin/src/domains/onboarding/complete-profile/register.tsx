import { registerModule } from "@/registry";
import dynamic from "next/dynamic";

registerModule({
  key: "complete-profile",
  domain: "onboarding",
  items: [
    {
      key: "complete-profile",
      path: "/onboarding/complete-profile",
      component: dynamic(
        () => import("@/domains/onboarding/complete-profile/complete-profile-page")
      ),
    },
  ],
});
