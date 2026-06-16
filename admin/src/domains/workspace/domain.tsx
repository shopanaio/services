import { registerDomain } from "@/registry";
import { WorkspaceLayout } from "./layouts/workspace-layout";

registerDomain({
  key: "workspace",
  layout: WorkspaceLayout,
});
