"use client";

import { Typography, Flex, Tag, Empty } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type {
  PricingRuleTemplate,
  IDependencyRule,
} from "@/domains/inventory/products/modals/edit-components-modal/types";
import { PRICE_RULE_OPTIONS } from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  templateRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
  },
  ruleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 0",
  },
  priceTag: {
    fontFamily: "monospace",
  },
  divider: {
    margin: "8px 0",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IPricingSectionProps {
  pricingTemplates: PricingRuleTemplate[];
  dependencyRules: IDependencyRule[];
  onEdit: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const PricingSection = ({
  pricingTemplates,
  dependencyRules,
  onEdit,
}: IPricingSectionProps) => {
  const { styles } = useStyles();

  const hasContent = pricingTemplates.length > 0 || dependencyRules.length > 0;

  return (
    <Paper>
      <PaperHeader
        title="Pricing & Rules"
        actions={<EditAction onEdit={onEdit} label="Edit pricing" />}
      />
      {!hasContent ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No pricing templates or rules configured"
        />
      ) : (
        <Flex vertical gap={12}>
          {pricingTemplates.length > 0 && (
            <div className={styles.section}>
              <Typography.Text type="secondary" strong>
                Templates ({pricingTemplates.length})
              </Typography.Text>
              {pricingTemplates.map((tpl) => {
                const option = PRICE_RULE_OPTIONS.find((o) => o.value === tpl.priceType);
                return (
                  <div key={tpl.id} className={styles.templateRow}>
                    <Typography.Text>{tpl.name}</Typography.Text>
                    <Tag className={styles.priceTag}>
                      {option?.label}
                      {tpl.priceValue != null && ` ${tpl.priceValue}${option?.valueSuffix ?? ""}`}
                    </Tag>
                  </div>
                );
              })}
            </div>
          )}

          {pricingTemplates.length > 0 && dependencyRules.length > 0 && (
            <div className={styles.divider} />
          )}

          {dependencyRules.length > 0 && (
            <div className={styles.section}>
              <Typography.Text type="secondary" strong>
                Dependency Rules ({dependencyRules.length})
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
        </Flex>
      )}
    </Paper>
  );
};
