import { registerLocalAdminAppModule } from "../runtime/federation/load-remote-module";

registerLocalAdminAppModule("hello_world_admin", "./Page", () =>
  import("./page"),
);
registerLocalAdminAppModule("hello_world_admin", "./GreetingModal", () =>
  import("./greeting-modal"),
);
registerLocalAdminAppModule("hello_world_admin", "./OrderNote", () =>
  import("./order-note"),
);
