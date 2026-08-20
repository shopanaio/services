"use client";

import { Controller, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { Alert, Button, Divider, InputNumber, Radio, Skeleton, Switch, Typography } from "antd";
import { createStyles } from "antd-style";
import { SearchField, SearchOutOfStockPolicy } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { normalizeSearchField, SEARCH_FIELD_DEFINITIONS } from "../mappers";
import type { MappedSearchSettingsError } from "../mappers";
import type { SearchSettingsFormValues } from "./types";

const useStyles = createStyles(({ token }) => ({
  description: {
    display: "block",
    marginTop: -token.marginXS,
    marginBottom: token.marginLG,
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 120px",
    gap: token.padding,
    paddingBottom: token.paddingXS,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 120px",
    gap: token.padding,
    alignItems: "start",
    padding: `${token.paddingXS}px 0`,
    "@media (max-width: 560px)": {
      gridTemplateColumns: "1fr",
    },
  },
  fieldIdentity: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: token.paddingSM,
    alignItems: "start",
  },
  switch: {
    marginTop: 3,
  },
  switchLabel: {
    cursor: "pointer",
  },
  switchLabelDisabled: {
    cursor: "default",
  },
  help: {
    display: "block",
    marginTop: 2,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXXS,
  },
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: token.padding,
  },
  radioGroup: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXS,
    marginTop: token.paddingXS,
  },
  metadata: {
    display: "block",
    marginTop: token.marginLG,
  },
  alert: {
    marginBottom: token.margin,
  },
}));

interface SearchSettingsPaperProps {
  control: Control<SearchSettingsFormValues>;
  errors: FieldErrors<SearchSettingsFormValues>;
  apiErrors: MappedSearchSettingsError[];
  loading: boolean;
  queryError: Error | null;
  waitingForSettings: boolean;
  updatedAt: string | null;
  onRetry: () => void;
}

function firstApiError(
  errors: MappedSearchSettingsError[],
  target: MappedSearchSettingsError["target"],
) {
  return errors.find((error) => error.target === target)?.message;
}

export function SearchSettingsPaper({
  control,
  errors,
  apiErrors,
  loading,
  queryError,
  waitingForSettings,
  updatedAt,
  onRetry,
}: SearchSettingsPaperProps) {
  const { styles } = useStyles();
  const fieldValues = useWatch({ control, name: "fields" });
  const globalErrors = apiErrors.filter((error) => error.target === "global");
  const fieldsValidationError = errors.fields as
    { message?: string; root?: { message?: string } } | undefined;
  const fieldsError =
    fieldsValidationError?.message ??
    fieldsValidationError?.root?.message ??
    firstApiError(apiErrors, "fields");

  return (
    <Paper data-testid="search-settings-section">
      <PaperHeader title="Search Relevance" />
      <Typography.Text type="secondary" className={styles.description}>
        Choose what shoppers can search and how results are ranked.
      </Typography.Text>

      {loading ? (
        <Skeleton active title={false} paragraph={{ rows: 12 }} />
      ) : queryError ? (
        <Alert
          role="alert"
          type="error"
          showIcon
          message="Search settings could not be loaded."
          description={queryError.message}
          action={<Button onClick={onRetry}>Retry</Button>}
        />
      ) : waitingForSettings ? (
        <Alert
          type="info"
          showIcon
          message="Search settings are being prepared."
          description="This normally takes only a moment after the store is created."
          action={<Button onClick={onRetry}>Check again</Button>}
        />
      ) : (
        <>
          {globalErrors.length ? (
            <Alert
              role="alert"
              type="error"
              showIcon
              className={styles.alert}
              message="Search settings could not be saved."
              description={globalErrors.map((error) => error.message).join(" ")}
            />
          ) : null}

          <div className={styles.tableHeader} aria-hidden="true">
            <span>Searchable fields</span>
            <span>Weight</span>
          </div>

          {SEARCH_FIELD_DEFINITIONS.map((definition, index) => {
            const normalized = normalizeSearchField(definition.field);
            const isRequired = definition.field === SearchField.ProductTitle;
            const switchId = `search-field-${normalized}-switch`;
            const helpId = `search-field-${normalized}-help`;
            const groupErrorId = fieldsError ? "search-fields-error" : undefined;
            const enabledApiError = firstApiError(apiErrors, `field.${definition.field}.enabled`);
            const weightApiError = firstApiError(apiErrors, `field.${definition.field}.weight`);
            const weightError = errors.fields?.[index]?.weight?.message ?? weightApiError;

            return (
              <div className={styles.fieldRow} key={definition.field}>
                <div className={styles.fieldIdentity}>
                  <Controller
                    name={`fields.${index}.enabled`}
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id={switchId}
                        ref={field.ref}
                        size="small"
                        className={styles.switch}
                        checked={isRequired || field.value}
                        disabled={isRequired}
                        onChange={field.onChange}
                        aria-label={`Search ${definition.label.toLowerCase()}`}
                        aria-describedby={
                          [
                            helpId,
                            groupErrorId,
                            enabledApiError
                              ? `search-field-${normalized}-enabled-error`
                              : undefined,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        data-testid={`search-field-${normalized}-switch`}
                      />
                    )}
                  />
                  <div>
                    <label
                      htmlFor={switchId}
                      className={isRequired ? styles.switchLabelDisabled : styles.switchLabel}
                    >
                      <Typography.Text strong>{definition.label}</Typography.Text>
                    </label>
                    <span id={helpId} className={styles.help}>
                      {definition.help}
                    </span>
                    {enabledApiError ? (
                      <div
                        id={`search-field-${normalized}-enabled-error`}
                        role="alert"
                        className={styles.error}
                      >
                        {enabledApiError}
                      </div>
                    ) : null}
                  </div>
                </div>
                <Controller
                  name={`fields.${index}.weight`}
                  control={control}
                  render={({ field }) => (
                    <div>
                      <InputNumber
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        min={0.01}
                        max={100}
                        step={0.1}
                        precision={2}
                        disabled={!isRequired && !fieldValues[index]?.enabled}
                        status={weightError ? "error" : undefined}
                        aria-label={`${definition.label} weight`}
                        aria-describedby={
                          weightError ? `search-field-${normalized}-weight-error` : undefined
                        }
                        data-testid={`search-field-${normalized}-weight-input`}
                        style={{ width: "100%" }}
                      />
                      {weightError ? (
                        <div
                          id={`search-field-${normalized}-weight-error`}
                          role="alert"
                          className={styles.error}
                        >
                          {weightError}
                        </div>
                      ) : null}
                    </div>
                  )}
                />
              </div>
            );
          })}

          {fieldsError ? (
            <div id="search-fields-error" role="alert" className={styles.error}>
              {fieldsError}
            </div>
          ) : null}

          <Divider />

          <div className={styles.settingRow}>
            <div>
              <label htmlFor="search-typo-tolerance-switch" className={styles.switchLabel}>
                <Typography.Text strong>Typo tolerance</Typography.Text>
              </label>
              <span id="search-typo-tolerance-help" className={styles.help}>
                Retry eligible searches with typo expansion when exact search is weak.
              </span>
              {firstApiError(apiErrors, "typoToleranceEnabled") ? (
                <div role="alert" className={styles.error}>
                  {firstApiError(apiErrors, "typoToleranceEnabled")}
                </div>
              ) : null}
            </div>
            <Controller
              name="typoToleranceEnabled"
              control={control}
              render={({ field }) => (
                <Switch
                  id="search-typo-tolerance-switch"
                  ref={field.ref}
                  size="small"
                  className={styles.switch}
                  checked={field.value}
                  onChange={field.onChange}
                  aria-label="Typo tolerance"
                  aria-describedby="search-typo-tolerance-help"
                  data-testid="search-typo-tolerance-switch"
                />
              )}
            />
          </div>

          <Divider />

          <div>
            <Typography.Text strong>Out-of-stock products</Typography.Text>
            <Controller
              name="outOfStockPolicy"
              control={control}
              render={({ field }) => (
                <Radio.Group
                  {...field}
                  className={styles.radioGroup}
                  aria-label="Out-of-stock products"
                  aria-describedby={
                    firstApiError(apiErrors, "outOfStockPolicy")
                      ? "search-out-of-stock-error"
                      : undefined
                  }
                  data-testid="search-out-of-stock-policy"
                >
                  <Radio value={SearchOutOfStockPolicy.Show}>Show in relevance order</Radio>
                  <Radio value={SearchOutOfStockPolicy.PlaceLast}>
                    Show after available products
                  </Radio>
                  <Radio value={SearchOutOfStockPolicy.Hide}>Hide from search results</Radio>
                </Radio.Group>
              )}
            />
            {firstApiError(apiErrors, "outOfStockPolicy") ? (
              <div id="search-out-of-stock-error" role="alert" className={styles.error}>
                {firstApiError(apiErrors, "outOfStockPolicy")}
              </div>
            ) : null}
          </div>

          {updatedAt ? (
            <Typography.Text type="secondary" className={styles.metadata}>
              Updated{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(updatedAt))}
            </Typography.Text>
          ) : null}
        </>
      )}
    </Paper>
  );
}
