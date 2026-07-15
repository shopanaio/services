"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Button } from "antd";
import { createStyles } from "antd-style";
import type { ApiSearchSettings } from "@/graphql/types";
import { DataLayout } from "@/layouts/data";
import { FacetScopesSettingsPaper } from "@/domains/discovery/facets/components";
import {
  useSearchEditorContext,
  useSearchSettingsNavigationGuard,
  useUpdateSearchSettings,
} from "../hooks";
import {
  INITIAL_SEARCH_SETTINGS_FORM_VALUES,
  mapSearchSettingsErrors,
  mapSearchSettingsFormToOperations,
  mapSearchSettingsToFormValues,
  normalizeSearchField,
  type MappedSearchSettingsError,
} from "../mappers";
import { searchSettingsFormSchema } from "./schema";
import { SearchSettingsPaper } from "./search-settings-paper";
import type { SearchSettingsFormValues } from "./types";

const useStyles = createStyles(({ token }) => ({
  content: {
    height: "100%",
    overflow: "auto",
    paddingBottom: token.paddingXL,
  },
  wrapper: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: token.padding,
  },
}));

function focusFirstApiError(errors: MappedSearchSettingsError[]) {
  const first = errors.find(
    (error) => error.target !== "global" && error.target !== "versionConflict",
  );
  if (!first) return;

  let testId: string | null = null;
  if (first.target === "fields") {
    testId = "search-field-product-title-switch";
  } else if (first.target === "typoToleranceEnabled") {
    testId = "search-typo-tolerance-switch";
  } else if (first.target === "outOfStockPolicy") {
    testId = "search-out-of-stock-policy";
  } else if (first.target.startsWith("field.")) {
    const [, field, control] = first.target.split(".");
    testId = `search-field-${normalizeSearchField(
      field as Parameters<typeof normalizeSearchField>[0],
    )}-${control === "weight" ? "weight-input" : "switch"}`;
  }

  if (!testId) return;
  requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    element?.focus();
  });
}

export default function SearchSettingsPage() {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const query = useSearchEditorContext();
  const mutation = useUpdateSearchSettings();
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const hydratedRef = useRef(false);
  const [baselineSettings, setBaselineSettings] =
    useState<ApiSearchSettings | null>(null);
  const [apiErrors, setApiErrors] = useState<MappedSearchSettingsError[]>([]);
  const [versionConflict, setVersionConflict] = useState(false);
  const [submittedFingerprint, setSubmittedFingerprint] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isDirty, isValid },
  } = useForm<SearchSettingsFormValues>({
    resolver: zodResolver(searchSettingsFormSchema),
    defaultValues: INITIAL_SEARCH_SETTINGS_FORM_VALUES,
    mode: "onChange",
  });
  const draft = useWatch({ control });
  const draftFingerprint = useMemo(() => JSON.stringify(draft), [draft]);

  useSearchSettingsNavigationGuard(isDirty, mutation.loading);

  useEffect(() => {
    if (
      hydratedRef.current ||
      !query.hasLoaded ||
      query.error ||
      mutation.loading
    ) {
      return;
    }

    const settings = query.settings;
    if (!settings) {
      setBaselineSettings(null);
      return;
    }

    reset(mapSearchSettingsToFormValues(settings));
    setBaselineSettings(settings);
    hydratedRef.current = true;
    void trigger();
  }, [mutation.loading, query.error, query.hasLoaded, query.settings, reset, trigger]);

  useEffect(() => {
    if (!query.hasLoaded || query.error || query.loading || query.settings) return;

    const timeout = window.setTimeout(() => {
      void query.refetch();
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [query.error, query.hasLoaded, query.loading, query.refetch, query.settings]);

  useEffect(() => {
    if (
      submittedFingerprint &&
      submittedFingerprint !== draftFingerprint &&
      apiErrors.length > 0
    ) {
      setApiErrors([]);
      setSubmittedFingerprint(null);
    }
  }, [apiErrors.length, draftFingerprint, submittedFingerprint]);

  const retryQuery = useCallback(async () => {
    try {
      const result = await query.refetch();
      const settings = result.data?.listingQuery.search.settings ?? null;
      if (settings) reset(mapSearchSettingsToFormValues(settings));
      setBaselineSettings(settings);
      hydratedRef.current = Boolean(settings);
      setApiErrors([]);
      setVersionConflict(false);
      void trigger();
    } catch {
      // Apollo exposes the retry error through the query hook.
    }
  }, [query, reset, trigger]);

  const reloadLatest = useCallback(async () => {
    if (isDirty) {
      const confirmed = await modal.confirm({
        title: "Replace unsaved changes?",
        content: "Reloading will replace this draft with the latest settings.",
        okText: "Reload settings",
      });
      if (!confirmed) return;
    }
    await retryQuery();
  }, [isDirty, modal, retryQuery]);

  const submit = useCallback(
    async (values: SearchSettingsFormValues) => {
      if (!query.hasLoaded || query.error || versionConflict || !baselineSettings) return;

      const mapping = mapSearchSettingsFormToOperations(values);
      const fingerprint = JSON.stringify(values);
      setApiErrors([]);
      setSubmittedFingerprint(fingerprint);

      const result = await mutation.updateSearchSettings(
        baselineSettings.version,
        mapping.operations,
      );

      if (!result.applied || !result.settings || result.userErrors.length > 0) {
        const mapped = mapSearchSettingsErrors(
          result.userErrors,
          mapping.submittedIndexToField,
        );
        setApiErrors(mapped);
        setVersionConflict(
          mapped.some((error) => error.target === "versionConflict"),
        );
        focusFirstApiError(mapped);
        return;
      }

      const canonicalValues = mapSearchSettingsToFormValues(result.settings);
      setBaselineSettings(result.settings);
      reset(canonicalValues);
      setApiErrors([]);
      setSubmittedFingerprint(null);
      setVersionConflict(false);
      message.success("Search settings saved.");
      requestAnimationFrame(() => saveButtonRef.current?.focus());
    },
    [baselineSettings?.version, message, mutation, query.error, query.hasLoaded, reset, versionConflict],
  );

  const handleInvalid = useCallback(
    (validationErrors: FieldErrors<SearchSettingsFormValues>) => {
      const fieldsGroupError = validationErrors.fields as
        | { message?: string; root?: { message?: string } }
        | undefined;
      if (!fieldsGroupError?.message && !fieldsGroupError?.root?.message) return;
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(
            '[data-testid="search-field-product-title-switch"]',
          )
          ?.focus();
      });
    },
    [],
  );

  const initialLoading = query.loading && !query.hasLoaded;
  const waitingForSettings = query.hasLoaded && !query.error && query.settings === null;
  const saveDisabled =
    !query.hasLoaded ||
    Boolean(query.error) ||
    query.loading ||
    mutation.loading ||
    !baselineSettings ||
    !isValid ||
    versionConflict ||
    !isDirty;

  return (
    <DataLayout name="search-settings">
      <DataLayout.Header>
        <DataLayout.Title>Preferences</DataLayout.Title>
        <DataLayout.HeaderActions>
          <Button
            ref={saveButtonRef}
            type="primary"
            loading={mutation.loading}
            disabled={saveDisabled}
            onClick={handleSubmit(submit, handleInvalid)}
            data-testid="discovery-settings-save-button"
          >
            Save
          </Button>
        </DataLayout.HeaderActions>
      </DataLayout.Header>

      <DataLayout.Content className={styles.content}>
        <main className={styles.wrapper} data-testid="discovery-settings-page">
          {versionConflict ? (
            <Alert
              role="alert"
              type="warning"
              showIcon
              message="These search settings changed after the page was opened."
              action={
                <Button loading={query.loading} onClick={reloadLatest}>
                  Reload latest settings
                </Button>
              }
            />
          ) : null}

          <SearchSettingsPaper
            control={control}
            errors={errors}
            apiErrors={apiErrors}
            loading={initialLoading}
            queryError={query.error}
            waitingForSettings={waitingForSettings}
            updatedAt={baselineSettings?.updatedAt ?? null}
            onRetry={retryQuery}
          />

          <FacetScopesSettingsPaper />
        </main>
      </DataLayout.Content>
    </DataLayout>
  );
}
