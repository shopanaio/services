"use client";

import { createStyles } from "antd-style";
import { Button, Typography, Tabs, Dropdown, Flex } from "antd";
import { WarningOutlined, MoreOutlined } from "@ant-design/icons";
import { AIButton } from "@/ui-kit/ai-button";
import { Paper } from "@/ui-kit/paper";
import type { ICategoryDetail } from "../category-details-card/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  tabsSection: {
    minHeight: 120,
  },
  contentText: {
    "&&": {
      margin: 0,
      fontSize: 13,
      color: token.colorText,
      lineHeight: 1.6,
    },
  },
  renderedContent: {
    fontSize: 13,
    color: token.colorText,
    lineHeight: 1.6,
    minHeight: 80,
    maxHeight: 120,
    overflow: "hidden",
    position: "relative" as const,
    "& p": {
      margin: "0 0 8px 0",
      "&:last-child": {
        marginBottom: 0,
      },
    },
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      margin: "12px 0 8px 0",
      fontWeight: 600,
      "&:first-child": {
        marginTop: 0,
      },
    },
    "& h3": {
      fontSize: 14,
    },
    "& ul, & ol": {
      margin: "8px 0",
      paddingLeft: 20,
    },
    "& li": {
      marginBottom: 4,
    },
    "&::after": {
      content: '""',
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: 40,
      background: `linear-gradient(transparent, ${token.colorBgContainer})`,
      pointerEvents: "none" as const,
    },
  },
  emptyContainer: {
    padding: "16px 0",
  },
  emptyIcon: {
    color: token.colorTextQuaternary,
  },
  emptyText: {
    fontSize: 12,
  },
  addButton: {
    padding: 0,
    height: "auto",
  },
}));

// ============================================================================
// Types
// ============================================================================

interface ICategoryContentTabsProps {
  category: ICategoryDetail;
}

// ============================================================================
// Main Component
// ============================================================================

export const CategoryContentTabs = ({
  category,
}: ICategoryContentTabsProps) => {
  const { styles } = useStyles();

  const handleWriteWithAI = () => {
    console.log("AI writer for category:", category.id);
  };

  const handleEditDescription = () => {
    console.log("Edit description for category:", category.id);
  };

  const descriptionHtml = category.description
    ? `<p>${category.description}</p>`
    : null;
  const excerptHtml = category.excerpt ? `<p>${category.excerpt}</p>` : null;

  return (
    <Paper className={styles.tabsSection}>
      <Tabs
        type="card"
        size="middle"
        tabBarExtraContent={
          <Flex gap={8}>
            <AIButton onClick={handleWriteWithAI} />
            <Dropdown
              menu={{
                items: [
                  {
                    key: "edit",
                    label: "Edit content",
                    onClick: handleEditDescription,
                  },
                ],
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Flex>
        }
        items={[
          {
            key: "description",
            label: "Description",
            children: descriptionHtml ? (
              <div
                className={styles.renderedContent}
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <Flex align="center" gap={8} className={styles.emptyContainer}>
                <WarningOutlined className={styles.emptyIcon} />
                <Typography.Text type="secondary" className={styles.emptyText}>
                  No description added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleEditDescription}
                  className={styles.addButton}
                >
                  Add now
                </Button>
              </Flex>
            ),
          },
          {
            key: "excerpt",
            label: "Excerpt",
            children: excerptHtml ? (
              <div
                className={styles.renderedContent}
                dangerouslySetInnerHTML={{ __html: excerptHtml }}
              />
            ) : (
              <Flex align="center" gap={8} className={styles.emptyContainer}>
                <WarningOutlined className={styles.emptyIcon} />
                <Typography.Text type="secondary" className={styles.emptyText}>
                  No excerpt added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleEditDescription}
                  className={styles.addButton}
                >
                  Add now
                </Button>
              </Flex>
            ),
          },
        ]}
      />
    </Paper>
  );
};
