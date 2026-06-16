import { Typography, Flex } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { ReactNode } from "react";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SeoPreview } from "./seo-preview";
import type { ISeoPreviewData } from "./seo-preview.types";

export interface ISeoData extends ISeoPreviewData {
  title?: string;
  excerpt?: string | null;
  slug?: string;
}

interface ISeoBlockProps {
  data: ISeoData;
  actions?: ReactNode;
}

export const SeoBlock = ({ data, actions }: ISeoBlockProps) => {
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

  const previewData: ISeoPreviewData = {
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription || data.excerpt,
    ogTitle: data.ogTitle,
    ogDescription: data.ogDescription,
    ogImage: data.ogImage,
    productTitle: data.title || data.productTitle,
    productSlug: data.productSlug || data.slug,
    baseUrl: data.baseUrl,
  };

  return (
    <Paper>
      <PaperHeader title="SEO" extra={issuesExtra} actions={actions} />
      <SeoPreview data={previewData} />
    </Paper>
  );
};
