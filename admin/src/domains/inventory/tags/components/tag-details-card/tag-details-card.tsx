"use client";

import { Button, Dropdown, Flex, Tag, Typography } from "antd";
import {
  CalendarOutlined,
  MoreOutlined,
  ShoppingOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { useTagEditIdentityModal } from "../../modals";
import type { TagDetailsCardProps } from "./types";

export const TagDetailsCard = ({ tag, onRefetch }: TagDetailsCardProps) => {
  const { push: openEditIdentityModal } = useTagEditIdentityModal();

  return (
    <Flex
      vertical
      gap={12}
      style={{ width: "100%" }}
      data-testid="tag-details-card"
    >
      <Paper data-testid="tag-header-section">
        <PaperHeader
          title={
            <Flex align="center" gap={8}>
              <Tag
                color="processing"
                icon={<TagOutlined />}
                data-testid="tag-detail-status"
              >
                Tag
              </Tag>
              <Typography.Text type="secondary">
                Created {formatDetailDate(tag.createdAt)}
              </Typography.Text>
            </Flex>
          }
          actions={
            <Dropdown
              menu={{
                items: [
                  {
                    key: "identity",
                    label: "Edit identity",
                    onClick: () =>
                      openEditIdentityModal({
                        tag,
                        onSaved: onRefetch,
                      }),
                  },
                ],
              }}
              trigger={["click"]}
            >
              <Button
                size="small"
                icon={<MoreOutlined />}
                data-testid="tag-header-actions-button"
              />
            </Dropdown>
          }
        />

        <Flex vertical gap={8}>
          <Typography.Title
            level={3}
            ellipsis={{ rows: 2, tooltip: tag.name }}
            style={{ margin: 0 }}
            data-testid="tag-detail-title"
          >
            {tag.name || "Untitled Tag"}
          </Typography.Title>

          <Flex align="center" gap={12} wrap="wrap">
            <CopyableChip
              label="#"
              value={tag.handle}
              data-testid="tag-detail-handle"
            />
            <CopyableChip
              label="ID"
              value={tag.id}
              displayValue={tag.id.slice(0, 8)}
              mono
            />
          </Flex>
        </Flex>
      </Paper>

      <Paper data-testid="tag-usage-section">
        <PaperHeader title="Usage" />
        <Flex gap={8} wrap="wrap">
          <KPITile
            label="Products"
            value={tag.productsCount}
            secondary="Assigned products"
            icon={<ShoppingOutlined />}
            variant="primary"
            dataTestId="tag-detail-products-count"
          />
          <KPITile
            label="Created"
            value={formatDetailDate(tag.createdAt)}
            secondary="Tag creation date"
            icon={<CalendarOutlined />}
            dataTestId="tag-detail-created-at"
          />
        </Flex>
      </Paper>
    </Flex>
  );
};
