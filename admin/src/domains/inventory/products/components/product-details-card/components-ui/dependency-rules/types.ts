/** UI option metadata with no GraphQL equivalent. */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface OperatorMetadata {
  label: string;
  symbol: string;
  requiresValue: boolean;
}

export interface ActionMetadata {
  label: string;
  description: string;
  requiresPriceType?: boolean;
}
