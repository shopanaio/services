import { useState, useMemo, useRef } from "react";
import { Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import type { ITableRow } from "../types";
import type { PricingRuleTemplate, BundleItem } from "../../../types";
import { BundlePriceType, PRICE_RULE_OPTIONS } from "../../../types";

// Helper to determine if pricingRule is a template
const isTemplate = (
  rule: BundleItem["pricingRule"] | undefined,
): rule is PricingRuleTemplate => {
  return !!rule && "id" in rule && "name" in rule;
};

const TEMPLATE_PREFIX = "tpl:";

export interface IPriceRuleCellRendererParams extends ICellRendererParams<ITableRow> {
  pricingTemplates: PricingRuleTemplate[];
  onPriceRuleChange: (
    itemId: string,
    pricingRule: BundleItem["pricingRule"],
  ) => void;
}

export const PriceRuleCellRenderer = ({
  data,
  pricingTemplates,
  onPriceRuleChange,
}: IPriceRuleCellRendererParams) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const menuItems = useMemo<MenuProps["items"]>(() => {
    const items: MenuProps["items"] = [];

    if (pricingTemplates.length > 0) {
      items.push({
        key: "templates",
        type: "group",
        label: "Templates",
        children: pricingTemplates.map((tpl) => ({
          key: `${TEMPLATE_PREFIX}${tpl.id}`,
          label: tpl.name,
        })),
      });
    }

    items.push({
      key: "custom",
      type: "group",
      label: "Custom",
      children: PRICE_RULE_OPTIONS.map((opt) => ({
        key: opt.value,
        label: opt.label,
      })),
    });

    return items;
  }, [pricingTemplates]);

  if (!data || data.type === "group") return null;

  const { pricingRule } = data;
  if (!pricingRule) return null;

  // Determine display label
  const displayLabel = isTemplate(pricingRule)
    ? pricingRule.name
    : (PRICE_RULE_OPTIONS.find((opt) => opt.value === pricingRule.priceType)
        ?.label ?? pricingRule.priceType);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key.startsWith(TEMPLATE_PREFIX)) {
      const templateId = key.replace(TEMPLATE_PREFIX, "");
      const template = pricingTemplates.find((t) => t.id === templateId);
      if (template) {
        onPriceRuleChange(data.id, template);
      }
    } else {
      const priceType = key as BundlePriceType;
      const rule = PRICE_RULE_OPTIONS.find((r) => r.value === priceType);

      const prevValue = isTemplate(pricingRule)
        ? pricingRule.priceValue
        : pricingRule.priceValue;

      onPriceRuleChange(data.id, {
        priceType,
        priceValue: rule?.requiresValue ? (prevValue ?? 0) : null,
      });
    }
    setOpen(false);
  };

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: handleMenuClick }}
      trigger={["contextMenu"]}
      open={open}
      onOpenChange={(visible) => {
        if (!visible) setOpen(false);
      }}
      dropdownRender={(menu) => (
        <div style={{ width: triggerRef.current?.offsetWidth }}>{menu}</div>
      )}
    >
      <div
        ref={triggerRef}
        onDoubleClick={() => setOpen(true)}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 11px",
        }}
      >
        <span>{displayLabel}</span>
        <DownOutlined style={{ fontSize: 10, color: "rgba(0, 0, 0, 0.25)" }} />
      </div>
    </Dropdown>
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
