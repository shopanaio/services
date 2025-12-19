import type { User } from "@zaytra/casdoor-node-client-ext";
import type { Kernel } from "../kernel/Kernel.js";

export interface ServiceContext {
  requestId: string;
  kernel: Kernel;
  currentUser?: User | null;
}
