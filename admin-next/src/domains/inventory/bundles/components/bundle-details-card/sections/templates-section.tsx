"use client";

import { Typography, Empty, Tag } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type {
  PricingRuleTemplate,
} from "@/domains/inventory/products/modals/edit-components-modal/types";
import { PRICE_RULE_OPTIONS } from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
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
  priceTag: {
    fontFamily: "monospace",
  },
}));

// ============================================================================
// Props
// ============================================================================

interface ITemplatesSectionProps {
  pricingTemplates: PricingRuleTemplate[];
  onEdit: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const TemplatesSection = ({
  pricingTemplates,
  onEdit,
}: ITemplatesSectionProps) => {
  const { styles } = useStyles();

  return (
    <Paper>
      <PaperHeader
        title="Pricing Templates"
        actions={<EditAction onEdit={onEdit} label="Edit templates" />}
      />
      {pricingTemplates.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No pricing templates configured"
        />
      ) : (
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
    </Paper>
  );
};
