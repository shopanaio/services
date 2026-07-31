import type { ReactNode } from "react";
import type {
  ApiVariant,
  ApiPageInfo,
} from "@/graphql/types";

// ============================================================================
// Section Props
// ============================================================================

export interface ISectionProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  extra?: ReactNode;
}

// ============================================================================
// Variants Table Connection Types
// ============================================================================

export interface IVariantsTableData {
  variants: ApiVariant[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}
