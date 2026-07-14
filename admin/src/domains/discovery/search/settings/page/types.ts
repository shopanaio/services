import type { SearchField, SearchOutOfStockPolicy } from "@/graphql/types";

export interface SearchSettingsFieldFormValue {
  field: SearchField;
  enabled: boolean;
  weight: number;
}

export interface SearchSettingsFormValues {
  fields: SearchSettingsFieldFormValue[];
  typoToleranceEnabled: boolean;
  outOfStockPolicy: SearchOutOfStockPolicy;
}
