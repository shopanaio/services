import type { LocaleUpdatePayload } from "./shared.js";

export interface CreateLocaleInput {
  code: string;
  isActive: boolean;
}

export interface UpdateLocaleInput {
  code: string;
  isActive: boolean;
}

export interface LocaleUpdateParams {
  projectId: string;
  create: CreateLocaleInput[];
  update: UpdateLocaleInput[];
  delete: string[];
}

export type LocaleUpdateResult = LocaleUpdatePayload;

export interface LocaleSetDefaultParams {
  projectId: string;
  locale: string;
}

export type LocaleSetDefaultResult = LocaleUpdatePayload;
