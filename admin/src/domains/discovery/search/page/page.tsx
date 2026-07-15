"use client";

import { Alert, Card, Skeleton, Tag, Typography } from "antd";
import { BarChartOutlined, FontSizeOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { DataLayout } from "@/layouts/data";
import { usePathParams } from "@/registry";
import { useProductBoosts } from "../product-boosts/hooks";
import { useSynonymGroups } from "../synonyms/hooks";

const useStyles = createStyles(({ token }) => ({
  content: {
    height: "100%",
    overflow: "auto",
    paddingBottom: token.paddingXL,
  },
  card: {
    overflow: "hidden",
    boxShadow: token.boxShadowTertiary,
    ".ant-card-body": {
      padding: 0,
    },
  },
  row: {
    appearance: "none",
    width: "100%",
    border: 0,
    background: token.colorBgContainer,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "44px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: token.padding,
    minHeight: 80,
    padding: `${token.padding}px ${token.paddingLG}px`,
    textAlign: "left",
    transition: `background-color ${token.motionDurationMid}`,
    "&:hover": {
      background: token.colorFillQuaternary,
    },
    "&:focus-visible": {
      outline: `2px solid ${token.colorPrimary}`,
      outlineOffset: -2,
    },
    "& + &": {
      borderTop: `1px solid ${token.colorBorderSecondary}`,
    },
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "40px minmax(0, 1fr)",
      minHeight: 72,
      padding: token.padding,
    },
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: token.colorFillQuaternary,
    color: token.colorTextSecondary,
    display: "grid",
    placeItems: "center",
    fontSize: 18,
    [`@media (max-width: ${token.screenSM}px)`]: {
      width: 40,
      height: 40,
      fontSize: 16,
    },
  },
  copy: {
    minWidth: 0,
  },
  title: {
    display: "block",
    fontSize: token.fontSizeLG,
  },
  description: {
    display: "block",
    marginTop: token.marginXXS,
  },
  countSlot: {
    whiteSpace: "nowrap",
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridColumn: "2",
      justifySelf: "start",
    },
  },
  count: {
    marginInlineEnd: 0,
    fontSize: token.fontSizeSM,
    fontVariantNumeric: "tabular-nums",
  },
}));

interface SearchSectionProps {
  title: string;
  description: string;
  count: number;
  singularLabel: string;
  pluralLabel: string;
  loading: boolean;
  icon: ReactNode;
  onClick: () => void;
}

function SearchSection({
  title,
  description,
  count,
  singularLabel,
  pluralLabel,
  loading,
  icon,
  onClick,
}: SearchSectionProps) {
  const { styles } = useStyles();
  const countLabel = count === 1 ? singularLabel : pluralLabel;

  return (
    <button className={styles.row} type="button" onClick={onClick}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.copy}>
        <Typography.Text strong className={styles.title}>
          {title}
        </Typography.Text>
        <Typography.Text type="secondary" className={styles.description}>
          {description}
        </Typography.Text>
      </span>
      <span className={styles.countSlot}>
        {loading ? (
          <Skeleton.Input active size="small" style={{ width: 88 }} />
        ) : (
          <Tag
            bordered={false}
            color={count > 0 ? "blue" : undefined}
            className={styles.count}
          >
            {count} {countLabel}
          </Tag>
        )}
      </span>
    </button>
  );
}

export default function SearchPage() {
  const { styles } = useStyles();
  const router = useRouter();
  const { resolvePath } = usePathParams();
  const productBoosts = useProductBoosts({ first: 1 });
  const synonymGroups = useSynonymGroups({ first: 1 });
  const error = productBoosts.error ?? synonymGroups.error;

  return (
    <DataLayout name="search">
      <DataLayout.Header>
        <DataLayout.Title>Search</DataLayout.Title>
      </DataLayout.Header>

      <DataLayout.Content className={styles.content}>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Could not load search configuration counts."
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Card className={styles.card} data-testid="search-sections-card">
          <SearchSection
            title="Product boosts"
            description="Choose products to promote in your online store's search results."
            count={productBoosts.totalCount}
            singularLabel="product boost"
            pluralLabel="product boosts"
            loading={productBoosts.loading}
            icon={<BarChartOutlined />}
            onClick={() =>
              router.push(
                resolvePath("/:orgName/:storeName/search/product-boosts"),
              )
            }
          />
          <SearchSection
            title="Synonyms"
            description="Add synonym groups to improve your online store's search results."
            count={synonymGroups.totalCount}
            singularLabel="synonym group"
            pluralLabel="synonym groups"
            loading={synonymGroups.loading}
            icon={<FontSizeOutlined />}
            onClick={() =>
              router.push(resolvePath("/:orgName/:storeName/search/synonyms"))
            }
          />
        </Card>
      </DataLayout.Content>
    </DataLayout>
  );
}
