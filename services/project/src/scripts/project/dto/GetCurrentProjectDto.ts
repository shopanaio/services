import type { ProjectPayload } from "./shared.js";

export interface GetCurrentProjectParams {
  /** JWT access token */
  accessToken: string;
  /** Project slug */
  slug: string;
}

export interface GetCurrentProjectResult extends ProjectPayload {}
