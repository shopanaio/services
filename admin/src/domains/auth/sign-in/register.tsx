import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { LuLogIn as LoginOutlined } from "react-icons/lu";

registerModule({
  key: "sign-in",
  domain: "auth",
  sidebar: {
    label: "Sign In",
    icon: <LoginOutlined />,
    order: 1,
  },
  items: [
    {
      key: "sign-in",
      path: "/sign-in",
      component: dynamic(
        () => import("@/domains/auth/sign-in/sign-in-page")
      ),
    },
  ],
});
