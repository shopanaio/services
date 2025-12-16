import type { ProjectStatus } from "../../../repositories/models/index.js";
import type { ProjectPayload } from "./shared.js";

export interface ProjectCreateParams {
  name: string;
  slug: string;
  locales: string[];
  currency: string;
  country: string;
  status?: ProjectStatus;
  timezone?: string;
  phoneNumber?: string;
  email?: string;
}

export type ProjectCreateResult = ProjectPayload;
