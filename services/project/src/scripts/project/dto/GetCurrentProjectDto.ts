import type { ProjectPayload } from "./shared.js";

export interface GetCurrentProjectParams {
  /** User's organization/tenant ID from IAM */
  userOwner: string;
  /** Project slug */
  slug: string;
}

export interface GetCurrentProjectResult extends ProjectPayload {}
