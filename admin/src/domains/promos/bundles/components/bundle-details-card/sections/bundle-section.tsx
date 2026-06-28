"use client";

import { Button, Dropdown, Flex, Tag, Typography } from "antd";
import {
  MoreOutlined,
  PartitionOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type { IBundleGroup } from "@/domains/promos/bundles/types";
import type { IDependencyRule } from "@/domains/promos/bundles/dependency-rules/types";
import type { BundleType } from "@/graphql/types";
import { BUNDLE_TYPE_CONFIG } from "./groups-section/constants";
import { GroupsSection } from "./groups-section";
import { DependencyRulesSection } from "./dependency-rules-section";

interface IBundleSectionProps {
  groups: IBundleGroup[];
  bundleType?: BundleType | null;
  dependencyRules: IDependencyRule[];
  onEditGroups: () => void;
  onOpenChart: () => void;
  onAddRule: () => void;
  onEditRule: (ruleId: string) => void;
}

export const BundleSection = ({
  groups,
  bundleType,
  dependencyRules,
  onEditGroups,
  onOpenChart,
  onAddRule,
  onEditRule,
}: IBundleSectionProps) => (
  <Paper>
    <PaperHeader
      title="Bundle"
      extra={
        bundleType && BUNDLE_TYPE_CONFIG[bundleType] ? (
          <Tag color={BUNDLE_TYPE_CONFIG[bundleType].color}>
            {BUNDLE_TYPE_CONFIG[bundleType].label}
          </Tag>
        ) : undefined
      }
    />
    <Flex vertical gap={16}>
      <Flex vertical gap={10}>
        <Flex align="center" justify="space-between">
          <Typography.Text strong>Groups</Typography.Text>
          <EditAction onEdit={onEditGroups} label="Edit bundle items" />
        </Flex>
        <GroupsSection groups={groups} onEdit={onEditGroups} />
      </Flex>

      <Flex vertical gap={10}>
        <Flex align="center" justify="space-between">
          <Typography.Text strong>Pricing rules</Typography.Text>
          <Dropdown
            menu={{
              items: [
                {
                  key: "add",
                  icon: <PlusOutlined />,
                  label: "Add Rule",
                },
                {
                  key: "chart",
                  icon: <PartitionOutlined />,
                  label: "Open Chart",
                  disabled: dependencyRules.length === 0,
                },
              ],
              onClick: ({ key }) => {
                if (key === "add") onAddRule();
                if (key === "chart") onOpenChart();
              },
            }}
            trigger={["click"]}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Flex>
        <DependencyRulesSection
          dependencyRules={dependencyRules}
          groups={groups}
          onEditRule={onEditRule}
        />
      </Flex>
    </Flex>
  </Paper>
);
