import type { ReactNode } from "react";
import { EntitySeoSection } from "@/domains/inventory/components/entity-details-sections";
import type { EntitySeoPreviewData } from "@/domains/inventory/components/entity-details-sections";

export interface ISeoData extends EntitySeoPreviewData {
  title?: string;
  excerpt?: string | null;
  slug?: string;
}

interface ISeoBlockProps {
  data: ISeoData;
  actions?: ReactNode;
  sectionTestId?: string;
}

export const SeoBlock = ({ data, actions, sectionTestId }: ISeoBlockProps) => (
  <EntitySeoSection data={data} actions={actions} sectionTestId={sectionTestId} />
);
