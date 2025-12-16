import type { ProjectStatus, CurrencyCode, LocaleCode } from "../../../repositories/models/index.js";
import type { ProjectPayload } from "./shared.js";

export interface ProjectCreateParams {
  name: string;
  slug: string;
  locales: LocaleCode[];
  baseCurrency: CurrencyCode;
  status?: ProjectStatus;
  timezone?: string;
  phoneNumber?: string;
  email?: string;
}

export type ProjectCreateResult = ProjectPayload;
