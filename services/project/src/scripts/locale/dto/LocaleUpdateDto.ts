import type { LocaleCode } from "../../../repositories/models/index.js";
import type { LocaleUpdatePayload } from "./shared.js";

export interface CreateLocaleInput {
  code: LocaleCode;
  isActive: boolean;
}

export interface UpdateLocaleInput {
  code: LocaleCode;
  isActive: boolean;
}

export interface LocaleUpdateParams {
  projectId: string;
  create: CreateLocaleInput[];
  update: UpdateLocaleInput[];
  delete: LocaleCode[];
}

export type LocaleUpdateResult = LocaleUpdatePayload;

export interface LocaleSetDefaultParams {
  projectId: string;
  locale: LocaleCode;
}

export type LocaleSetDefaultResult = LocaleUpdatePayload;
