import type { ProjectPayload } from "./shared.js";

export interface GetCurrentProjectParams {
  /** Project slug */
  slug: string;
}

export interface GetCurrentProjectResult extends ProjectPayload {}
