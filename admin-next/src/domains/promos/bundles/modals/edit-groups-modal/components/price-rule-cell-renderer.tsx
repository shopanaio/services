import { useState } from "react";
import { Select } from "antd";
import { DownOutlined } from "@ant-design/icons";
import type { ICellRendererParams } from "ag-grid-community";
import type { ITableRow } from "../types";
import type { PricingRuleTemplate, BundleItem } from "../../../types";
import { BundlePriceType, PRICE_RULE_OPTIONS } from "../../../types";

// Helper to determine if pricingRule is a template
const isTemplate = (
  rule: BundleItem["pricingRule"] | undefined
): rule is PricingRuleTemplate => {
  return !!rule && "id" in rule && "name" in rule;
};

const TEMPLATE_PREFIX = "tpl:";

export interface IPriceRuleCellRendererParams
  extends ICellRendererParams<ITableRow> {
  pricingTemplates: PricingRuleTemplate[];
  onPriceRuleChange: (
    itemId: string,
    pricingRule: BundleItem["pricingRule"]
  ) => void;
}

export const PriceRuleCellRenderer = ({
  data,
  pricingTemplates,
  onPriceRuleChange,
}: IPriceRuleCellRendererParams) => {
  const [open, setOpen] = useState(false);

  if (!data || data.type === "group") return null;

  const { pricingRule } = data;
  if (!pricingRule) return null;

  // Determine current value for Select
  const currentValue = isTemplate(pricingRule)
    ? `${TEMPLATE_PREFIX}${pricingRule.id}` // template
    : pricingRule.priceType; // custom rule

  // Options: Templates + Custom rules
  const options = [
    ...(pricingTemplates.length > 0
      ? [
          {
            label: "Templates",
            options: pricingTemplates.map((tpl) => ({
              label: tpl.name,
              value: `${TEMPLATE_PREFIX}${tpl.id}`,
            })),
          },
        ]
      : []),
    {
      label: "Custom",
      options: PRICE_RULE_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    },
  ];

  const handleChange = (value: string) => {
    if (value.startsWith(TEMPLATE_PREFIX)) {
      // Template selected - save the whole template object
      const templateId = value.replace(TEMPLATE_PREFIX, "");
      const template = pricingTemplates.find((t) => t.id === templateId);
      if (template) {
        onPriceRuleChange(data.id, template);
      }
    } else {
      // Custom rule selected - save inline object
      const priceType = value as BundlePriceType;
      const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);

      // Preserve priceValue if previous rule had same type
      const prevValue = isTemplate(pricingRule)
        ? pricingRule.priceValue
        : pricingRule.priceValue;

      onPriceRuleChange(data.id, {
        priceType,
        priceValue: rule?.requiresValue ? prevValue ?? 0 : null,
      });
    }
    setOpen(false);
  };

  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((prev) => !prev);
  };

  return (
    <Select
      open={open}
      onOpenChange={(visible) => {
        if (!visible) setOpen(false);
      }}
      suffixIcon={
        <DownOutlined
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleArrowClick}
        />
      }
      value={currentValue}
      onChange={handleChange}
      options={options}
      size="small"
      style={{ width: "100%" }}
      popupMatchSelectWidth={false}
      variant="borderless"
    />
  );
};

// Price Value Cell Renderer
export const PriceValueCellRenderer = ({
  data,
}: ICellRendererParams<ITableRow>) => {
  if (!data || data.type === "group") return null;

  const rule = data.pricingRule;
  if (!rule) return "—";

  const priceType = isTemplate(rule) ? rule.priceType : rule.priceType;
  const priceValue = isTemplate(rule) ? rule.priceValue : rule.priceValue;
  const option = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);

  if (!option?.requiresValue) return "—";
  if (priceValue == null) return "—";
  return `${priceValue}${option.valueSuffix || ""}`;
};
