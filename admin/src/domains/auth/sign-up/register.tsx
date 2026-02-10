import { registerModule } from "@/registry";
import dynamic from "next/dynamic";
import { UserAddOutlined } from "@ant-design/icons";

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
