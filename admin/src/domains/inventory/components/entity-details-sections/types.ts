import type { ReactNode } from "react";
import type { ApiFile } from "@/graphql/types";

export interface EntitySeoPreviewData {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: ApiFile | null;
  title?: string;
  slug?: string;
  baseUrl?: string;
  resourcePath?: string;
}

export interface EntitySeoBlockData extends EntitySeoPreviewData {
  excerpt?: string | null;
}

export interface EntityContentTabsEmptyState {
  title: string;
  description?: string;
}

export interface EntityContentTabsProps {
  descriptionHtml?: string | null;
  excerptHtml?: string | null;
  actions?: ReactNode;
  sectionTestId?: string;
  descriptionTestId: string;
  excerptTestId: string;
  descriptionEmpty: EntityContentTabsEmptyState;
  excerptEmpty: EntityContentTabsEmptyState;
}
