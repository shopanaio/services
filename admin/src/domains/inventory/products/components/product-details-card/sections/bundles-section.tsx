"use client";

import { Typography, Flex, Tag, Avatar } from "antd";
import { GiftOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useBundleModal } from "@/domains/inventory/bundles/modals";
import { useBundlesSectionStyles } from "../product-details-card.styles";
import { BundleType, type ApiBundle } from "@/graphql/types";

const BUNDLE_TYPE_CONFIG: Record<BundleType, { label: string; color: string }> = {
  [BundleType.Fixed]: { label: "Fixed", color: "blue" },
  [BundleType.Multipack]: { label: "Multipack", color: "green" },
  [BundleType.MixAndMatch]: { label: "Mix & Match", color: "purple" },
  [BundleType.Custom]: { label: "Custom", color: "default" },
};

interface IBundlesSectionProps {
  bundles: ApiBundle[];
}

export const BundlesSection = ({ bundles }: IBundlesSectionProps) => {
  const { styles } = useBundlesSectionStyles();
  const { push: openBundleModal } = useBundleModal();

  if (!bundles || bundles.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Bundles"
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {bundles.length} bundle{bundles.length !== 1 ? "s" : ""}
          </Typography.Text>
        }
      />
      <div className={styles.bundlesGrid}>
        {bundles.map((bundle) => {
          const typeConfig = bundle.type
            ? BUNDLE_TYPE_CONFIG[bundle.type]
            : null;
          const imageUrl = bundle.media[0]?.file.url;

          return (
            <div
              key={bundle.id}
              className={styles.bundleCard}
              onClick={() => openBundleModal({ entityId: bundle.id })}
            >
              <Flex gap={10} align="center">
                <Avatar
                  src={imageUrl}
                  size={40}
                  shape="square"
                  className={styles.bundleAvatar}
                  icon={<GiftOutlined />}
                />
                <Flex vertical gap={4} flex={1} style={{ minWidth: 0 }}>
                  <Typography.Text strong ellipsis className={styles.bundleName}>
                    {bundle.title}
                  </Typography.Text>
                  <Flex gap={4} wrap="wrap">
                    {typeConfig && (
                      <Tag color={typeConfig.color} className={styles.bundleTypeTag}>
                        {typeConfig.label}
                      </Tag>
                    )}
                    {!typeConfig && bundle.type === null && (
                      <Tag className={styles.bundleTypeTag}>Custom</Tag>
                    )}
                    <Tag
                      color={bundle.isPublished ? "success" : "default"}
                      className={styles.bundleStatusTag}
                    >
                      {bundle.isPublished ? "Published" : "Draft"}
                    </Tag>
                  </Flex>
                </Flex>
              </Flex>
            </div>
          );
        })}
      </div>
    </Paper>
  );
};
