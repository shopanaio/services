import {
  addCalendarDate,
  calendarDateAt,
  formatCalendarDate,
  resolveDateValue,
  startOfCalendarDayUtc,
  type CalendarDate,
  type SegmentDefinitionV1,
  type SegmentExpression,
  type SegmentFunctionExpression,
  type SegmentFunctionParameter,
  type SegmentPredicateExpression,
  type SegmentStoreEvaluationContext,
  type SegmentValue,
} from "@shopana/customer-segment-dsl";
import { sql, type SQL } from "drizzle-orm";

export interface CustomerSegmentCompileContext {
  readonly store: SegmentStoreEvaluationContext;
  readonly effectiveAt: string;
}

const PROFILE_COLUMNS: Readonly<Record<string, SQL>> = Object.freeze({
  customer_added_date: sql.raw("c.created_at"),
  customer_updated_date: sql.raw("c.updated_at"),
  last_activity_date: sql.raw("c.last_activity_at"),
  customer_account_status: sql.raw("c.account_status"),
  customer_lifecycle_status: sql.raw("c.lifecycle_status"),
  customer_language: sql.raw("c.preferred_locale_normalized"),
  customer_source: sql.raw("c.source"),
  customer_email_domain: sql.raw("c.email_domain_normalized"),
  email_verified: sql.raw("c.email_verified"),
  phone_verified: sql.raw("c.phone_verified"),
  company_name: sql.raw("c.company_name_normalized"),
  date_of_birth: sql.raw("c.date_of_birth"),
});

const STATISTICS_COLUMNS: Readonly<
  Record<string, { table: string; column: string; zero: boolean }>
> = Object.freeze({
  number_of_orders: { table: "customer_statistics", column: "completed_orders_count", zero: true },
  cancelled_orders_count: {
    table: "customer_statistics",
    column: "cancelled_orders_count",
    zero: true,
  },
  returns_count: { table: "customer_statistics", column: "returns_count", zero: true },
  first_order_date: { table: "customer_statistics", column: "first_order_at", zero: false },
  last_order_date: { table: "customer_statistics", column: "last_order_at", zero: false },
  last_checkout_date: { table: "customer_statistics", column: "last_checkout_at", zero: false },
  amount_spent: { table: "customer_monetary_statistics", column: "net_spent_minor", zero: true },
  gross_amount_spent: {
    table: "customer_monetary_statistics",
    column: "total_spent_minor",
    zero: true,
  },
  amount_refunded: {
    table: "customer_monetary_statistics",
    column: "total_refunded_minor",
    zero: true,
  },
  average_order_value: {
    table: "customer_monetary_statistics",
    column: "average_order_value_minor",
    zero: true,
  },
});

export function compileCustomerSegmentDefinition(
  definition: SegmentDefinitionV1,
  context: CustomerSegmentCompileContext,
): SQL {
  return compileExpression(definition.root, context);
}

export function compileCustomerSegmentMatchQuery(
  definition: SegmentDefinitionV1,
  customerId: string,
  context: CustomerSegmentCompileContext,
): SQL {
  const predicate = compileCustomerSegmentDefinition(definition, context);
  return sql`
    SELECT c.id
    FROM customers.customer AS c
    WHERE c.store_id = ${context.store.storeId}::uuid
      AND c.id = ${customerId}::uuid
      AND c.deleted_at IS NULL
      AND ${predicate}
    LIMIT 1
  `;
}

export function compileCustomerSegmentScanQuery(
  definition: SegmentDefinitionV1,
  context: CustomerSegmentCompileContext,
  afterCustomerId: string | null,
  limit: number,
): SQL {
  const predicate = compileCustomerSegmentDefinition(definition, context);
  return sql`
    SELECT c.id
    FROM customers.customer AS c
    WHERE c.store_id = ${context.store.storeId}::uuid
      AND c.deleted_at IS NULL
      AND (${afterCustomerId}::uuid IS NULL OR c.id > ${afterCustomerId}::uuid)
      AND ${predicate}
    ORDER BY c.id ASC
    LIMIT ${limit}
  `;
}

export function compileCustomerSegmentCountQuery(
  definition: SegmentDefinitionV1,
  context: CustomerSegmentCompileContext,
): SQL {
  const predicate = compileCustomerSegmentDefinition(definition, context);
  return sql`
    SELECT count(*)::integer AS count
    FROM customers.customer AS c
    WHERE c.store_id = ${context.store.storeId}::uuid
      AND c.deleted_at IS NULL
      AND ${predicate}
  `;
}

function compileExpression(
  expression: SegmentExpression,
  context: CustomerSegmentCompileContext,
): SQL {
  if (expression.kind === "logical") {
    const children = expression.children.map((child) => compileExpression(child, context));
    return parenthesizeJoin(children, expression.operator === "and" ? sql` AND ` : sql` OR `);
  }
  if (expression.kind === "not") {
    return sql`NOT (${compileExpression(expression.child, context)})`;
  }
  return expression.kind === "function"
    ? compileFunction(expression, context)
    : compilePredicate(expression, context);
}

function compilePredicate(
  expression: SegmentPredicateExpression,
  context: CustomerSegmentCompileContext,
): SQL {
  const profileColumn = PROFILE_COLUMNS[expression.attribute];
  if (profileColumn) {
    return expression.attribute === "date_of_birth"
      ? compileCalendarDatePredicate(profileColumn, expression, context)
      : isDateAttribute(expression.attribute)
        ? compileInstantDatePredicate(profileColumn, expression, context)
        : compileScalarPredicate(profileColumn, expression);
  }
  const statistics = STATISTICS_COLUMNS[expression.attribute];
  if (statistics) {
    const isMoney = statistics.table === "customer_monetary_statistics";
    const value = sql.raw(`s.${statistics.column}`);
    const where =
      statistics.table === "customer_monetary_statistics"
        ? sql` AND s.currency_code = ${context.store.currencyCode}`
        : sql``;
    const selected = statistics.zero
      ? sql`COALESCE((SELECT ${value} FROM ${sql.raw(`customers.${statistics.table}`)} AS s
          WHERE s.store_id = c.store_id AND s.customer_id = c.id${where}), 0)`
      : sql`(SELECT ${value} FROM ${sql.raw(`customers.${statistics.table}`)} AS s
          WHERE s.store_id = c.store_id AND s.customer_id = c.id${where})`;
    return isDateAttribute(expression.attribute)
      ? compileInstantDatePredicate(selected, expression, context)
      : compileScalarPredicate(selected, expression, isMoney ? "money" : "default");
  }
  switch (expression.attribute) {
    case "customer_countries":
      return compileListPredicate(
        expression,
        sql`customers.customer_address`,
        sql.raw("a.country_code"),
        sql`a.deleted_at IS NULL`,
      );
    case "customer_regions":
      return compileListPredicate(
        expression,
        sql`customers.customer_address`,
        sql.raw("a.region_key"),
        sql`a.deleted_at IS NULL`,
      );
    case "customer_cities":
      return compileListPredicate(
        expression,
        sql`customers.customer_address`,
        sql.raw("a.city_key"),
        sql`a.deleted_at IS NULL`,
      );
    case "customer_postal_codes":
      return compileListPredicate(
        expression,
        sql`customers.customer_address`,
        sql.raw("a.postal_code_normalized"),
        sql`a.deleted_at IS NULL`,
      );
    case "customer_tags":
      return compileListPredicate(
        expression,
        sql`customers.customer_tag_assignment`,
        sql.raw("a.tag_id"),
        sql`EXISTS (
          SELECT 1 FROM customers.customer_tag AS t
          WHERE t.store_id = a.store_id AND t.id = a.tag_id AND t.deleted_at IS NULL
        )`,
      );
    case "customer_groups":
      return compileListPredicate(
        expression,
        sql`customers.customer_group_membership`,
        sql.raw("a.group_id"),
        sql`(a.expires_at IS NULL OR a.expires_at > ${context.effectiveAt}::timestamptz)
          AND EXISTS (
            SELECT 1 FROM customers.customer_group AS g
            WHERE g.store_id = a.store_id AND g.id = a.group_id AND g.deleted_at IS NULL
          )`,
      );
    case "email_subscription_status":
      return compileConsent(expression, "EMAIL");
    case "sms_subscription_status":
      return compileConsent(expression, "SMS");
    case "whatsapp_subscription_status":
      return compileConsent(expression, "WHATSAPP");
    case "push_subscription_status":
      return compileConsent(expression, "PUSH");
    case "tax_identifier_statuses":
      return compileTaxList(expression, context, "identifier");
    case "tax_exemption_statuses":
      return compileTaxList(expression, context, "exemption");
    case "tax_exemption_countries":
      return compileTaxList(expression, context, "country");
    case "birthday":
      return compileBirthday(expression, context);
    default:
      throw new Error(`No SQL compiler for segment attribute ${expression.attribute}`);
  }
}

function compileScalarPredicate(
  column: SQL,
  expression: SegmentPredicateExpression,
  valueMode: "default" | "money" = "default",
): SQL {
  if (expression.operator === "is_null") return sql`${column} IS NULL`;
  if (expression.operator === "is_not_null") return sql`${column} IS NOT NULL`;
  if (expression.operator === "in" || expression.operator === "not_in") {
    const values = expression.values.map((value) => scalarValue(value, valueMode));
    const contains = sql`${column} IN (${sql.join(values, sql`, `)})`;
    return expression.operator === "in"
      ? sql`${column} IS NOT NULL AND ${contains}`
      : sql`${column} IS NOT NULL AND NOT (${contains})`;
  }
  if (expression.operator === "between") {
    return sql`${column} IS NOT NULL
      AND ${column} >= ${scalarValue(expression.value, valueMode)}
      AND ${column} <= ${scalarValue(expression.upperValue, valueMode)}`;
  }
  if (!("value" in expression))
    throw new Error(`Unsupported scalar operator ${expression.operator}`);
  const value = scalarValue(expression.value, valueMode);
  switch (expression.operator) {
    case "eq":
      return sql`${column} IS NOT NULL AND ${column} = ${value}`;
    case "neq":
      return sql`${column} IS NOT NULL AND ${column} <> ${value}`;
    case "gt":
      return sql`${column} IS NOT NULL AND ${column} > ${value}`;
    case "gte":
      return sql`${column} IS NOT NULL AND ${column} >= ${value}`;
    case "lt":
      return sql`${column} IS NOT NULL AND ${column} < ${value}`;
    case "lte":
      return sql`${column} IS NOT NULL AND ${column} <= ${value}`;
    default:
      throw new Error(`Unsupported scalar operator ${expression.operator}`);
  }
}

function compileInstantDatePredicate(
  column: SQL,
  expression: SegmentPredicateExpression,
  context: CustomerSegmentCompileContext,
): SQL {
  if (expression.operator === "is_null" || expression.operator === "is_not_null") {
    return compileScalarPredicate(column, expression);
  }
  if (expression.operator === "between") {
    const lower = dateBounds(expression.value, context);
    const upper = dateBounds(expression.upperValue, context);
    return sql`${column} IS NOT NULL AND ${column} >= ${lower.start}::timestamptz AND ${column} < ${upper.end}::timestamptz`;
  }
  if (expression.operator === "in" || expression.operator === "not_in") {
    throw new Error("Date IN is not supported by the registry");
  }
  if (!("value" in expression)) throw new Error(`Unsupported date operator ${expression.operator}`);
  const bounds = dateBounds(expression.value, context);
  const matches = sql`${column} >= ${bounds.start}::timestamptz AND ${column} < ${bounds.end}::timestamptz`;
  switch (expression.operator) {
    case "eq":
      return sql`${column} IS NOT NULL AND ${matches}`;
    case "neq":
      return sql`${column} IS NOT NULL AND NOT (${matches})`;
    case "gt":
      return sql`${column} IS NOT NULL AND ${column} >= ${bounds.end}::timestamptz`;
    case "gte":
      return sql`${column} IS NOT NULL AND ${column} >= ${bounds.start}::timestamptz`;
    case "lt":
      return sql`${column} IS NOT NULL AND ${column} < ${bounds.start}::timestamptz`;
    case "lte":
      return sql`${column} IS NOT NULL AND ${column} < ${bounds.end}::timestamptz`;
    default:
      throw new Error(`Unsupported date operator ${expression.operator}`);
  }
}

function compileCalendarDatePredicate(
  column: SQL,
  expression: SegmentPredicateExpression,
  context: CustomerSegmentCompileContext,
): SQL {
  if (expression.operator === "is_null" || expression.operator === "is_not_null") {
    return compileScalarPredicate(column, expression);
  }
  const mapped = mapDateValues(expression, context);
  return compileScalarPredicate(column, mapped);
}

function compileListPredicate(
  expression: SegmentPredicateExpression,
  table: SQL,
  valueColumn: SQL,
  active: SQL,
): SQL {
  const exists = (extra: SQL) => sql`EXISTS (
    SELECT 1 FROM ${table} AS a
    WHERE a.store_id = c.store_id AND a.customer_id = c.id AND ${active} AND ${extra}
  )`;
  if (expression.operator === "is_null") return sql`NOT (${exists(sql`TRUE`)})`;
  if (expression.operator === "is_not_null") return exists(sql`TRUE`);
  if (expression.operator !== "contains" && expression.operator !== "not_contains") {
    throw new Error(`Invalid list operator ${expression.operator}`);
  }
  if (!("value" in expression)) throw new Error("Invalid list predicate value");
  const match = exists(sql`${valueColumn} = ${scalarValue(expression.value)}`);
  return expression.operator === "contains" ? match : sql`NOT (${match})`;
}

function compileConsent(expression: SegmentPredicateExpression, channel: string): SQL {
  const value = sql`(
    SELECT a.state FROM customers.customer_consent AS a
    WHERE a.store_id = c.store_id AND a.customer_id = c.id AND a.channel = ${channel}
    LIMIT 1
  )`;
  return compileScalarPredicate(value, expression);
}

function compileTaxList(
  expression: SegmentPredicateExpression,
  context: CustomerSegmentCompileContext,
  kind: "identifier" | "exemption" | "country",
): SQL {
  const today = formatCalendarDate(calendarDateAt(context.effectiveAt, context.store.timeZone));
  const table =
    kind === "identifier"
      ? sql`customers.customer_tax_identifier`
      : sql`customers.customer_tax_exemption`;
  const effectiveStatus =
    kind === "identifier"
      ? sql`CASE WHEN a.status = 'REJECTED' THEN 'REJECTED'
        WHEN a.valid_to IS NOT NULL AND a.valid_to < ${today}::date THEN 'EXPIRED'
        ELSE a.status::text END`
      : sql`CASE WHEN a.status = 'REVOKED' THEN 'REVOKED'
        WHEN a.valid_to IS NOT NULL AND a.valid_to < ${today}::date THEN 'EXPIRED'
        ELSE a.status::text END`;
  const valueColumn = kind === "country" ? sql.raw("a.country_code") : effectiveStatus;
  const active =
    kind === "country"
      ? sql`${effectiveStatus} = 'ACTIVE' AND a.country_code IS NOT NULL`
      : sql`TRUE`;
  const exists = (extra: SQL) => sql`EXISTS (
    SELECT 1 FROM ${table} AS a
    WHERE a.store_id = c.store_id AND a.customer_id = c.id
      AND a.deleted_at IS NULL
      AND (a.valid_from IS NULL OR a.valid_from <= ${today}::date)
      AND ${active} AND ${extra}
  )`;
  if (expression.operator === "is_null") return sql`NOT (${exists(sql`TRUE`)})`;
  if (expression.operator === "is_not_null") return exists(sql`TRUE`);
  if (expression.operator !== "contains" && expression.operator !== "not_contains") {
    throw new Error(`Invalid tax list operator ${expression.operator}`);
  }
  const match = exists(sql`${valueColumn} = ${scalarValue(expression.value)}`);
  return expression.operator === "contains" ? match : sql`NOT (${match})`;
}

function compileBirthday(
  expression: SegmentPredicateExpression,
  context: CustomerSegmentCompileContext,
): SQL {
  const column = sql.raw("c.birthday_month_day");
  if (expression.operator === "is_null" || expression.operator === "is_not_null") {
    return compileScalarPredicate(column, expression);
  }
  if (
    expression.operator === "in" ||
    expression.operator === "not_in" ||
    expression.operator === "gt" ||
    expression.operator === "gte" ||
    expression.operator === "lt" ||
    expression.operator === "lte"
  ) {
    throw new Error(`Invalid birthday operator ${expression.operator}`);
  }
  if (!("value" in expression)) throw new Error(`Invalid birthday operator ${expression.operator}`);
  const dates =
    expression.operator === "between"
      ? birthdayRange(expression.value, expression.upperValue, context)
      : birthdayKeys(expression.value, context);
  const matches = sql`${column} IN (${sql.join(
    dates.map((value) => sql`${value}`),
    sql`, `,
  )})`;
  return expression.operator === "neq"
    ? sql`${column} IS NOT NULL AND NOT (${matches})`
    : sql`${column} IS NOT NULL AND ${matches}`;
}

function compileFunction(
  expression: SegmentFunctionExpression,
  context: CustomerSegmentCompileContext,
): SQL {
  if (expression.name !== "orders_placed") {
    throw new Error(`No SQL compiler for segment function ${expression.name}`);
  }
  const anyOrder = sql`EXISTS (
    SELECT 1 FROM customers.customer_order_projection AS o
    WHERE o.store_id = c.store_id AND o.customer_id = c.id
  )`;
  if (expression.operator === "is_null") return sql`NOT (${anyOrder})`;
  if (expression.operator === "is_not_null") return anyOrder;

  if (!("parameters" in expression))
    throw new Error(`Invalid function operator ${expression.operator}`);
  const parameters = expression.parameters;
  const ordinary = parameters.filter((parameter) => !isAggregateParameter(parameter));
  const aggregates = parameters.filter(isAggregateParameter);
  const requiresCurrency = parameters.some(
    (parameter) => parameter.name === "amount" || parameter.name === "sum_amount",
  );
  const filters = ordinary.map((parameter) => compileOrderParameter(parameter, context));
  if (requiresCurrency) filters.unshift(sql`o.currency_code = ${context.store.currencyCode}`);
  const where = filters.length > 0 ? parenthesizeJoin(filters, sql` AND `) : sql`TRUE`;
  const matches =
    aggregates.length === 0
      ? sql`EXISTS (
        SELECT 1 FROM customers.customer_order_projection AS o
        WHERE o.store_id = c.store_id AND o.customer_id = c.id AND ${where}
      )`
      : parenthesizeJoin(
          aggregates.map((parameter) => {
            const aggregate =
              parameter.name === "count"
                ? sql`COUNT(*)`
                : sql`COALESCE(SUM(o.total_amount_minor), 0)`;
            const scalar = compileAggregateComparison(aggregate, parameter);
            return sql`(
            SELECT ${scalar}
            FROM customers.customer_order_projection AS o
            WHERE o.store_id = c.store_id AND o.customer_id = c.id AND ${where}
          )`;
          }),
          sql` AND `,
        );
  return expression.operator === "matches" ? matches : sql`NOT (${matches})`;
}

function compileOrderParameter(
  parameter: SegmentFunctionParameter,
  context: CustomerSegmentCompileContext,
): SQL {
  const mapping: Readonly<Record<string, SQL>> = {
    status: sql.raw("o.status"),
    created_date: sql.raw("o.created_at"),
    completed_date: sql.raw("o.completed_at"),
    cancelled_date: sql.raw("o.cancelled_at"),
    amount: sql.raw("o.total_amount_minor"),
  };
  const column = mapping[parameter.name];
  if (!column) throw new Error(`Invalid ordinary orders_placed parameter ${parameter.name}`);
  const predicate = parameterToPredicate(parameter);
  return parameter.name.endsWith("_date")
    ? compileInstantDatePredicate(column, predicate, context)
    : compileScalarPredicate(column, predicate, parameter.name === "amount" ? "money" : "default");
}

function compileAggregateComparison(aggregate: SQL, parameter: SegmentFunctionParameter): SQL {
  return compileScalarPredicate(
    aggregate,
    parameterToPredicate(parameter),
    parameter.name === "sum_amount" ? "money" : "default",
  );
}

function parameterToPredicate(parameter: SegmentFunctionParameter): SegmentPredicateExpression {
  if (parameter.operator === "is_null" || parameter.operator === "is_not_null") {
    return { kind: "predicate", attribute: parameter.name, operator: parameter.operator };
  }
  if (parameter.operator === "in" || parameter.operator === "not_in") {
    return {
      kind: "predicate",
      attribute: parameter.name,
      operator: parameter.operator,
      values: parameter.values,
    };
  }
  if (parameter.operator === "between") {
    return {
      kind: "predicate",
      attribute: parameter.name,
      operator: "between",
      value: parameter.value,
      upperValue: parameter.upperValue,
    };
  }
  if (!("value" in parameter))
    throw new Error(`Invalid function parameter operator ${parameter.operator}`);
  return {
    kind: "predicate",
    attribute: parameter.name,
    operator: parameter.operator,
    value: parameter.value,
  };
}

function isAggregateParameter(parameter: SegmentFunctionParameter): boolean {
  return parameter.name === "count" || parameter.name === "sum_amount";
}

function scalarValue(value: SegmentValue, mode: "default" | "money" = "default"): SQL {
  switch (value.kind) {
    case "string":
      return sql`${value.value}`;
    case "enum":
      return sql`${value.value}`;
    case "boolean":
      return sql`${value.value}`;
    case "integer":
      return sql`${value.value}::bigint`;
    case "decimal":
      return sql`${value.value}::numeric`;
    case "money":
      return mode === "money" ? sql`${value.minor}::bigint` : sql`${value.decimal}::numeric`;
    case "date":
      return sql`${value.value}::date`;
    case "dateTime":
      return sql`${value.value}::timestamptz`;
    case "entityId":
      return sql`${value.id}::uuid`;
    case "namedDate":
    case "relativeDate":
      throw new Error("Relative date must be resolved before scalar compilation");
  }
}

function dateBounds(value: SegmentValue, context: CustomerSegmentCompileContext) {
  const date = resolvedCalendarDate(value, context);
  return {
    start: startOfCalendarDayUtc(date, context.store.timeZone),
    end: startOfCalendarDayUtc(addCalendarDate(date, 1, "day"), context.store.timeZone),
  };
}

function resolvedCalendarDate(
  value: SegmentValue,
  context: CustomerSegmentCompileContext,
): CalendarDate {
  if (value.kind !== "date" && value.kind !== "namedDate" && value.kind !== "relativeDate") {
    throw new Error("Expected a Date segment value");
  }
  return resolveDateValue(value, context.effectiveAt, context.store.timeZone);
}

function mapDateValues(
  expression: SegmentPredicateExpression,
  context: CustomerSegmentCompileContext,
): SegmentPredicateExpression {
  const map = (value: SegmentValue): SegmentValue => ({
    kind: "date",
    value: formatCalendarDate(resolvedCalendarDate(value, context)),
  });
  if (expression.operator === "between") {
    return { ...expression, value: map(expression.value), upperValue: map(expression.upperValue) };
  }
  if (expression.operator === "in" || expression.operator === "not_in") {
    return {
      ...expression,
      values: expression.values.map(map) as [SegmentValue, ...SegmentValue[]],
    };
  }
  if (expression.operator === "is_null" || expression.operator === "is_not_null") return expression;
  if (!("value" in expression)) throw new Error(`Invalid date operator ${expression.operator}`);
  return {
    kind: "predicate",
    attribute: expression.attribute,
    operator: expression.operator,
    value: map(expression.value),
  };
}

function birthdayKeys(value: SegmentValue, context: CustomerSegmentCompileContext): string[] {
  const date = resolvedCalendarDate(value, context);
  const keys = [`${String(date.month).padStart(2, "0")}${String(date.day).padStart(2, "0")}`];
  if (!isLeapYear(date.year) && date.month === 2 && date.day === 28) keys.push("0229");
  return keys;
}

function birthdayRange(
  lowerValue: SegmentValue,
  upperValue: SegmentValue,
  context: CustomerSegmentCompileContext,
): string[] {
  const lower = resolvedCalendarDate(lowerValue, context);
  const upper = resolvedCalendarDate(upperValue, context);
  const keys = new Set<string>();
  let current = lower;
  for (let elapsed = 0; elapsed <= 366; elapsed += 1) {
    birthdayKeys({ kind: "date", value: formatCalendarDate(current) }, context).forEach((key) =>
      keys.add(key),
    );
    if (sameDate(current, upper)) return [...keys].sort();
    current = addCalendarDate(current, 1, "day");
  }
  throw new Error("Birthday interval exceeds 366 calendar days");
}

function parenthesizeJoin(chunks: readonly SQL[], separator: SQL): SQL {
  if (chunks.length === 0) return sql`TRUE`;
  return sql`(${sql.join([...chunks], separator)})`;
}

function isDateAttribute(attribute: string): boolean {
  return attribute.endsWith("_date") || attribute === "last_activity_date";
}

function sameDate(left: CalendarDate, right: CalendarDate): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
