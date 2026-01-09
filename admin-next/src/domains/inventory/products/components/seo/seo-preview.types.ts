import type { IMediaFile } from "../../mocks/types";

export interface ISeoPreviewData {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: IMediaFile | null;
  // Fallbacks
  productTitle?: string;
  productSlug?: string;
  baseUrl?: string;
}
