"use client";

import { Alert, Skeleton, Tag } from "antd";
import { LuChartBar as BarChartOutlined, LuType as FontSizeOutlined } from "react-icons/lu";
import { createStyles } from "antd-style";
import { useRouter } from "next/navigation";
import { DataLayout } from "@/layouts/data";
import { SectionNavigator } from "@/layouts/section-navigation";
import { usePathParams } from "@/registry";
import { useProductBoosts } from "../product-boosts/hooks";
import { useSynonymGroups } from "../synonyms/hooks";

const useStyles = createStyles(({ token }) => ({
  content: {
    height: "100%",
    overflow: "auto",
    paddingBottom: token.paddingXL,
  },
  count: {
    marginInlineEnd: 0,
    fontSize: token.fontSizeSM,
    fontVariantNumeric: "tabular-nums",
  },
}));

export default function SearchPage() {
  const { styles } = useStyles();
  const router = useRouter();
  const { resolvePath } = usePathParams();
  const productBoosts = useProductBoosts({ first: 1 });
  const synonymGroups = useSynonymGroups({ first: 1 });
  const error = productBoosts.error ?? synonymGroups.error;
  const count = (value: number, singular: string, plural: string, loading: boolean) =>
    loading ? (
      <Skeleton.Input active size="small" style={{ width: 88 }} />
    ) : (
      <Tag bordered={false} color={value > 0 ? "blue" : undefined} className={styles.count}>
        {value} {value === 1 ? singular : plural}
      </Tag>
    );

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

        <SectionNavigator
          testId="search-sections-card"
          items={[
            {
              key: "product-boosts",
              title: "Product boosts",
              description: "Choose products to promote in your online store's search results.",
              icon: <BarChartOutlined />,
              trailing: count(
                productBoosts.totalCount,
                "product boost",
                "product boosts",
                productBoosts.loading,
              ),
              onClick: () => router.push(resolvePath("/:orgName/:storeName/search/product-boosts")),
            },
            {
              key: "synonyms",
              title: "Synonyms",
              description: "Add synonym groups to improve your online store's search results.",
              icon: <FontSizeOutlined />,
              trailing: count(
                synonymGroups.totalCount,
                "synonym group",
                "synonym groups",
                synonymGroups.loading,
              ),
              onClick: () => router.push(resolvePath("/:orgName/:storeName/search/synonyms")),
            },
          ]}
        />
      </DataLayout.Content>
    </DataLayout>
  );
}
