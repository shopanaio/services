"use client";

import { Typography, Empty, Tag } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type {
  IDependencyRule,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  ruleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IDependencyRulesSectionProps {
  dependencyRules: IDependencyRule[];
  onEdit: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const DependencyRulesSection = ({
  dependencyRules,
  onEdit,
}: IDependencyRulesSectionProps) => {
  const { styles } = useStyles();

  return (
    <Paper>
      <PaperHeader
        title="Dependency Rules"
        actions={<EditAction onEdit={onEdit} label="Edit rules" />}
      />
      {dependencyRules.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No dependency rules configured"
        />
      ) : (
        <div className={styles.section}>
          <Typography.Text type="secondary" strong>
            Rules ({dependencyRules.length})
          </Typography.Text>
          {dependencyRules.map((rule) => (
            <div key={rule.id} className={styles.ruleRow}>
              <Tag color={rule.enabled ? "blue" : undefined}>
                {rule.enabled ? "Active" : "Disabled"}
              </Tag>
              <Typography.Text>{rule.name}</Typography.Text>
            </div>
          ))}
        </div>
      )}
    </Paper>
  );
};
