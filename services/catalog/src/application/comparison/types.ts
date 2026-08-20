export interface ComparisonMatrixColumn { productId: string; variantId: string; position: number; savedForComparison: boolean }
export interface ComparisonMatrixCell { status: "VALUE" | "MISSING" | "NOT_APPLICABLE" | "UNAVAILABLE"; displayValue: string; canonicalKey: string }
export interface ComparisonMatrixRow { key: string; fieldId: string; name: string; description: string | null; hasDifferences: boolean; cells: ComparisonMatrixCell[] }
export interface ComparisonMatrixGroup { key: string; groupId: string; name: string; rows: ComparisonMatrixRow[] }
export interface ComparisonMatrix { key: string; profileId: string; categoryId: string; title: string; columns: ComparisonMatrixColumn[]; groups: ComparisonMatrixGroup[] }
