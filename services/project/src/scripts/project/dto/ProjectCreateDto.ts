import type { ProjectStatus, CurrencyCode, LocaleCode } from "../../../repositories/models/index.js";
import type { ProjectPayload } from "./shared.js";

export interface ProjectCreateParams {
  name: string;
  slug: string;
  locales: LocaleCode[];
  defaultCurrency: CurrencyCode;
  status?: ProjectStatus;
  timezone?: string;
  email?: string;
}

export type ProjectCreateResult = ProjectPayload;
