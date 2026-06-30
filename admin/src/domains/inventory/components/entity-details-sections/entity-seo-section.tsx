import type { ReactNode } from "react";
import { Flex, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SeoPreview } from "./seo-preview";
import type { EntitySeoBlockData, EntitySeoPreviewData } from "./types";

interface EntitySeoSectionProps {
  data: EntitySeoBlockData;
  actions?: ReactNode;
  sectionTestId?: string;
}

export const EntitySeoSection = ({
  data,
  actions,
  sectionTestId,
}: EntitySeoSectionProps) => {
  const seoIssuesCount =
    (!data.seoTitle ? 1 : 0) + (!data.seoDescription ? 1 : 0);

  const issuesExtra =
    seoIssuesCount > 0 ? (
      <Flex align="center" gap={4}>
        <WarningOutlined style={{ color: "var(--ant-color-error)", fontSize: 12 }} />
        <Typography.Text style={{ fontSize: 11, color: "var(--ant-color-error)" }}>
          {seoIssuesCount} {seoIssuesCount === 1 ? "issue" : "issues"}
        </Typography.Text>
      </Flex>
    ) : null;

  const previewData: EntitySeoPreviewData = {
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription || data.excerpt,
    ogTitle: data.ogTitle,
    ogDescription: data.ogDescription,
    ogImage: data.ogImage,
    title: data.title,
    slug: data.slug,
    baseUrl: data.baseUrl,
    resourcePath: data.resourcePath,
  };

  return (
    <Paper data-testid={sectionTestId}>
      <PaperHeader title="SEO" extra={issuesExtra} actions={actions} />
      <SeoPreview data={previewData} />
    </Paper>
  );
};
