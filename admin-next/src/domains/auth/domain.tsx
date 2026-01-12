import { registerDomain } from "@/registry";
import { AuthLayout } from "./layouts/auth-layout";

registerDomain({
  key: "auth",
  layout: AuthLayout,
});
