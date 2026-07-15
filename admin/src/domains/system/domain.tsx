import { AppLayout } from "@/layouts/app/components/layout/layout";
import { registerDomain } from "@/registry";
import { LuSettings2 } from "react-icons/lu";

registerDomain({
  key: "system",
  layout: AppLayout,
  sidebar: {
    label: "System",
    icon: <LuSettings2 />,
    order: 9,
  },
});
