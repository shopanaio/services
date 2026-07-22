import type {
  ApiGenericUserError,
  ApiLocale,
  ApiStore,
} from "@/graphql/types";

export type GeneralSettingsStore = Pick<
  ApiStore,
  | "id"
  | "revision"
  | "name"
  | "displayName"
  | "email"
  | "timezone"
  | "locales"
  | "currencyCode"
  | "defaultLocale"
  | "defaultWeightUnit"
  | "defaultDimensionUnit"
> & {
  organizationId: string;
  country: string;
  phoneNumber: string | null;
};

export interface GeneralSettingsSnapshot {
  store: GeneralSettingsStore;
  locales: ApiLocale[];
}

export interface GeneralSettingsMutationResult<TData> {
  data: TData | null;
  userErrors: ApiGenericUserError[];
}
