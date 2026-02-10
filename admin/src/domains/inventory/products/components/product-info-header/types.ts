import type { ReactNode } from "react";
import type { IProduct } from "@/mocks/products/types";

// ============================================================================
// KPI Types
// ============================================================================

export interface IKPIData {
  views: number;
  viewsTrend: number;
  orders: number;
  ordersTrend: number;
  conversion: number;
  conversionTrend: number;
  revenue: number;
  revenueTrend: number;
}

// ============================================================================
// Component Props
// ============================================================================

export interface IProductInfoHeaderProps {
  product: IProduct;
  kpiData?: IKPIData;
}

export interface IUserPopoverProps {
  firstName: string;
  lastName: string;
  email: string;
}

export interface ISharePopoverProps {
  url: string;
  copied: boolean;
  onCopy: () => void;
}

export interface ISocialLink {
  key: string;
  icon: ReactNode;
  color: string;
  getUrl: (url: string) => string;
}
