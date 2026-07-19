import { IAMType } from "./IAMType.js";

/** Application realm management query namespace. */
export class ApplicationQueryResolver extends IAMType<Record<string, never>> {
  application(_args: { organizationId: string; id: string }) {
    // TODO: Implement application query resolution.
  }

  applications(_args: unknown) {
    // TODO: Implement applications connection resolution.
  }
}
