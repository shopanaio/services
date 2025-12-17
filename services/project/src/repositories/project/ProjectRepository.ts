import type { PageInfo } from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  type ProjectStatus,
  type WeightUnit,
  type DimensionUnit,
  type CurrencyCode,
  type LocaleCode,
} from "../models/index.js";

export interface ProjectQueryInput {}
export interface ProjectRelayInput {}

export interface ProjectConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface CreateProjectData {
  name: string;
  slug: string;
  status?: ProjectStatus;
  timezone?: string;
  email?: string | null;
  defaultLocale?: LocaleCode;
  baseCurrency?: CurrencyCode;
  defaultCurrency?: CurrencyCode;
}

export interface UpdateProjectData {
  name?: string;
  email?: string | null;
  timezone?: string;
  defaultWeightUnit?: WeightUnit;
  defaultDimensionUnit?: DimensionUnit;
}

export class ProjectRepository extends BaseRepository {
  // TODO
}
