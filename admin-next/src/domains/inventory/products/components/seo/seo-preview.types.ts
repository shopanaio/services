import type { ApiFile } from "@/graphql/types";

export interface ISeoPreviewData {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: ApiFile | null;
  // Fallbacks
  productTitle?: string;
  productSlug?: string;
  baseUrl?: string;
}
