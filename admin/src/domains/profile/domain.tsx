import { registerDomain } from "@/registry";
import { WorkspaceLayout } from "@/domains/workspace/layouts/workspace-layout";

registerDomain({
  key: "profile",
  layout: WorkspaceLayout,
});
