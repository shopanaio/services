/**
 * Filter type definitions
 */
export enum FilterType {
  String = 'String',
  Number = 'Number',
  Date = 'Date',
  DateRange = 'DateRange',
  Boolean = 'Boolean',
  Enum = 'Enum',
  Relation = 'Relation',
  Price = 'Price',
  Weight = 'Weight',
  Integer = 'Integer',
  Translatable = 'Translatable',
  Locale = 'Locale',
}

/**
 * Filter operator definitions
 */
export enum FilterOperator {
  Eq = 'Eq',
  NotEq = 'NotEq',
  Gt = 'Gt',
  Gte = 'Gte',
  Lt = 'Lt',
  Lte = 'Lte',
  In = 'In',
  NotIn = 'NotIn',
  Like = 'Like',
  NotLike = 'NotLike',
  ILike = 'ILike',
  NotILike = 'NotILike',
  Is = 'Is',
  IsNot = 'IsNot',
  Between = 'Between',
}

/**
 * Option for enum/select filters
 */
export interface IFilterOption {
  label: React.ReactNode | string;
  value: unknown;
}

/**
 * Filter schema definition (configuration)
 * Defines what filters are available for an entity
 */
export interface IFilterSchema {
  /** Unique key for the filter */
  key: string;
  /** Display label */
  label: React.ReactNode | string;
  /** Filter type */
  type: FilterType;
  /** Available operators for this filter */
  operators: FilterOperator[];
  /** Key used in API payload (can be nested like 'variants.price') */
  payloadKey: string;
  /** Description shown in UI */
  description?: React.ReactNode | string;
  /** For Relation type - entity identifier */
  entity?: string;
  /** For Enum type - available options */
  options?: IFilterOption[];
  /** Nested filters (for relations) */
  children?: IFilterSchema[];
  /** Whether filter cannot be removed */
  fixed?: boolean;
}

/**
 * Active filter value (state)
 * Represents a filter that user has selected
 */
export interface IFilterValue {
  /** Reference to schema key */
  schemaKey: string;
  /** Display label */
  label: string;
  /** Filter type */
  type: FilterType;
  /** Selected operator */
  operator: FilterOperator;
  /** Filter value(s) */
  value: unknown;
  /** Path to filter (for nested) */
  keyPath: string[];
  /** Key for API payload */
  payloadKey: string;
  /** Entity type (for Relation) */
  entity?: string;
  /** Whether filter cannot be removed */
  fixed?: boolean;
}

/**
 * Operator metadata for UI
 */
export interface IOperatorMeta {
  /** Operator enum value */
  value: FilterOperator;
  /** Short literal (e.g., '=', '>', 'in') */
  literal: string;
  /** Full label (e.g., 'Is equal to') */
  label: string;
}

/**
 * Filter adapter interface
 * Implement this to convert filters to your API format
 */
export interface IFilterAdapter<TOutput = unknown> {
  /** Adapter name for debugging */
  name: string;

  /**
   * Convert a single filter value to output format
   */
  convert(filter: IFilterValue, schema: IFilterSchema | null): TOutput | null;

  /**
   * Combine multiple converted filters
   * @param filters - Array of converted filters
   * @param logic - Logical operator to combine with
   */
  combine(filters: TOutput[], logic: 'AND' | 'OR'): TOutput;

  /**
   * Build final payload from combined filters
   */
  build(combined: TOutput): unknown;
}

/**
 * Props for filter hooks
 */
export interface IUseFiltersOptions<TAdapter extends IFilterAdapter = IFilterAdapter> {
  /** Filter schema configuration */
  schema: IFilterSchema[];
  /** Initial filter values */
  initialFilters?: IFilterValue[];
  /** Adapter for converting filters to API format */
  adapter?: TAdapter;
  /** Callback when filters change */
  onChange?: (filters: IFilterValue[]) => void;
}

/**
 * Return type for useFilters hook
 */
export interface IUseFiltersReturn<TPayload = unknown> {
  /** Current filter values */
  filters: IFilterValue[];
  /** Set filters directly */
  setFilters: (filters: IFilterValue[]) => void;
  /** Add a new filter */
  addFilter: (filter: IFilterValue) => void;
  /** Remove filter by index */
  removeFilter: (index: number) => void;
  /** Update filter at index */
  updateFilter: (index: number, filter: Partial<IFilterValue>) => void;
  /** Reset all filters */
  reset: () => void;
  /** Props for FilterWidget component */
  widgetProps: {
    options: IFilterSchema[];
    value: IFilterValue[];
    onChange: (filters: IFilterValue[]) => void;
  };
  /** Converted payload (if adapter provided) */
  payload: TPayload | null;
}

/**
 * Props for RelationControl registry
 */
export interface IRelationControlProps {
  value: unknown;
  onChange: (value: unknown) => void;
  isMultiple: boolean;
  entity: string;
  status?: 'error';
  variant?: 'outlined' | 'borderless' | 'filled';
}

/**
 * Relation control component type
 */
export type RelationControlComponent = React.ComponentType<IRelationControlProps>;
