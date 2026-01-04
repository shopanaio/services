import { createStyles } from "antd-style";
import { Typography, Flex } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { Paper } from "../Paper";
import { PaperHeader } from "../PaperHeader";

// ============================================================================
// Types
// ============================================================================

export interface ISeoData {
  seoTitle?: string | null;
  seoDescription?: string | null;
  title?: string;
  excerpt?: string | null;
  slug?: string;
}

interface ISeoBlockProps {
  data: ISeoData;
  onEdit?: () => void;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  seoBox: {
    background: token.colorBgLayout,
    borderRadius: 6,
    padding: "12px 16px",
  },
  seoLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  seoPreview: {
    marginTop: 8,
  },
  seoTitle: {
    fontSize: 16,
    color: "#1a0dab",
    display: "block",
    lineHeight: 1.3,
    "&:hover": {
      textDecoration: "underline",
    },
  },
  seoUrl: {
    fontSize: 12,
    color: "#006621",
    display: "block",
    marginTop: 2,
  },
  seoDescription: {
    marginTop: 4,
    fontSize: 13,
    display: "block",
    lineHeight: 1.5,
  },
  seoWarning: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  seoWarningIcon: {
    color: token.colorWarning,
    fontSize: 12,
  },
  seoWarningText: {
    fontSize: 11,
  },
  seoIssueIcon: {
    color: token.colorError,
    fontSize: 12,
  },
  seoIssueText: {
    fontSize: 11,
    color: token.colorError,
  },
}));

// ============================================================================
// Main Component
// ============================================================================

export const SeoBlock = ({ data, onEdit }: ISeoBlockProps) => {
  const { styles } = useStyles();

  const seoIssuesCount =
    (!data.seoTitle ? 1 : 0) + (!data.seoDescription ? 1 : 0);

  const issuesExtra =
    seoIssuesCount > 0 ? (
      <Flex align="center" gap={4}>
        <WarningOutlined className={styles.seoIssueIcon} />
        <Typography.Text className={styles.seoIssueText}>
          {seoIssuesCount} {seoIssuesCount === 1 ? "issue" : "issues"}
        </Typography.Text>
      </Flex>
    ) : null;

  return (
    <Paper>
      <PaperHeader title="SEO" extra={issuesExtra} onEdit={onEdit} />
      <div className={styles.seoBox}>
        <Typography.Text type="secondary" className={styles.seoLabel}>
          Search preview
        </Typography.Text>
        <div className={styles.seoPreview}>
          <Typography.Text className={styles.seoTitle}>
            {data.seoTitle || data.title || "Untitled Product"}
          </Typography.Text>
          <Typography.Text className={styles.seoUrl}>
            yourstore.com › products › {data.slug}
          </Typography.Text>
          <Typography.Text type="secondary" className={styles.seoDescription}>
            {data.seoDescription ||
              data.excerpt ||
              "No description available for this product."}
          </Typography.Text>
        </div>

        {!data.seoTitle && !data.seoDescription && (
          <Flex align="center" gap={8} className={styles.seoWarning}>
            <WarningOutlined className={styles.seoWarningIcon} />
            <Typography.Text
              type="secondary"
              className={styles.seoWarningText}
            >
              Using auto-generated SEO data
            </Typography.Text>
          </Flex>
        )}
      </div>
    </Paper>
  );
};
