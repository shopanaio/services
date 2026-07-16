import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { LuUserPlus as UserAddOutlined } from "react-icons/lu";

registerModule({
  key: "sign-up",
  domain: "auth",
  sidebar: {
    label: "Sign Up",
    icon: <UserAddOutlined />,
    order: 2,
  },
  items: [
    {
      key: "sign-up",
      path: "/sign-up",
      component: dynamic(
        () => import("@/domains/auth/sign-up/sign-up-page")
      ),
    },
  ],
});
