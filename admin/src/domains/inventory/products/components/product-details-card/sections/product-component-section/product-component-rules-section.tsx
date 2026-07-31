"use client";

import { Empty, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import type {
  ApiProductComponentConfiguration,
  ApiProductComponentDependencyRule,
} from "@/graphql/types";
import { ProductComponentDependencyTargetType } from "@/graphql/types";

const useStyles = createStyles(({ token }) => ({
  rules: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  rule: {
    padding: "10px 12px",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  flow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    alignItems: "stretch",
    gap: 8,
    marginTop: 8,
  },
  block: {
    padding: "8px 10px",
    borderRadius: token.borderRadius,
    background: token.colorFillQuaternary,
  },
  label: {
    display: "block",
    marginBottom: 4,
    color: token.colorTextTertiary,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  line: {
    display: "block",
    fontSize: token.fontSizeSM,
  },
  arrow: {
    display: "flex",
    alignItems: "center",
    color: token.colorTextTertiary,
  },
}));

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function getTargetName(
  configuration: ApiProductComponentConfiguration,
  targetType: ProductComponentDependencyTargetType,
  targetId: string,
) {
  if (targetType === ProductComponentDependencyTargetType.Configuration) {
    return "configuration";
  }

  if (targetType === ProductComponentDependencyTargetType.Group) {
    return (
      configuration.groups.find((group) => group.id === targetId)?.title ??
      "unavailable group"
    );
  }

  for (const group of configuration.groups) {
    const item = group.items.find((candidate) => candidate.id === targetId);
    if (item) {
      return (
        item.title ??
        item.refProduct?.title ??
        item.refVariant?.title ??
        "component item"
      );
    }
  }

  return "unavailable item";
}

function Conditions({
  rule,
  configuration,
}: {
  rule: ApiProductComponentDependencyRule;
  configuration: ApiProductComponentConfiguration;
}) {
  const conditions = rule.conditionGroups.flatMap((group) => group.conditions);

  if (conditions.length === 0) {
    return <Typography.Text type="secondary">Always</Typography.Text>;
  }

  return conditions.map((condition) => (
    <Typography.Text key={condition.id}>
      {getTargetName(
        configuration,
        condition.targetType,
        condition.targetId,
      )}{" "}
      {humanize(condition.subject)} {humanize(condition.operator)}
      {condition.value == null ? "" : ` ${condition.value}`}
    </Typography.Text>
  ));
}

function Actions({
  rule,
  configuration,
}: {
  rule: ApiProductComponentDependencyRule;
  configuration: ApiProductComponentConfiguration;
}) {
  if (rule.actions.length === 0) {
    return <Typography.Text type="secondary">No actions</Typography.Text>;
  }

  return rule.actions.map((action) => (
    <Typography.Text key={action.id}>
      {humanize(action.actionType)}{" "}
      {getTargetName(configuration, action.targetType, action.targetId)}
    </Typography.Text>
  ));
}

export const ProductComponentRulesSection = ({
  configuration,
}: {
  configuration: ApiProductComponentConfiguration;
}) => {
  const { styles } = useStyles();

  if (configuration.dependencyRules.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No dependency rules configured"
      />
    );
  }

  return (
    <div className={styles.rules}>
      {[...configuration.dependencyRules]
        .sort((left, right) => left.priority - right.priority)
        .map((rule) => (
          <div key={rule.id} className={styles.rule}>
            <div className={styles.header}>
              <Typography.Text strong type={rule.enabled ? undefined : "secondary"}>
                {rule.name}
              </Typography.Text>
              <span>
                {!rule.enabled ? <Tag>Disabled</Tag> : null}
                <Tag>#{rule.priority}</Tag>
              </span>
            </div>
            {rule.enabled ? (
              <div className={styles.flow}>
                <div className={styles.block}>
                  <span className={styles.label}>When</span>
                  <div>
                    <Conditions rule={rule} configuration={configuration} />
                  </div>
                </div>
                <div className={styles.arrow}>→</div>
                <div className={styles.block}>
                  <span className={styles.label}>Then</span>
                  <div>
                    <Actions rule={rule} configuration={configuration} />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
    </div>
  );
};
