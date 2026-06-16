import type {
  ApiProductOption,
  ApiProductOptionValue,
  ApiProductOptionSwatch,
  ApiProductOptionSwatchInput,
  OptionDisplayType,
  SwatchType,
} from "@/graphql/types";

// Re-export API types for convenience
export type { ApiProductOption, ApiProductOptionValue, ApiProductOptionSwatch };
export type { OptionDisplayType, SwatchType };

// Form types - using API types directly
export type IOptionGroup = ApiProductOption;
export type IOptionValue = ApiProductOptionValue;
export type ISwatch = ApiProductOptionSwatchInput;

export interface IEditOptionsFormValues {
  groups: IOptionGroup[];
}
