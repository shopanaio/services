"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Flex,
  Input,
  Segmented,
  Select,
  Skeleton,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { shopCountries, shopLocales } from "@/defs/localization";
import { useDefaultCurrency } from "@/domains/workspace";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerModalPayload } from "../../modals";
import {
  useCreateCustomer,
  useCustomer,
  useCustomerEditorContext,
  useUpdateCustomer,
} from "../../hooks";
import {
  CustomerMarketingState,
  CustomerStatus,
} from "../../graphql/operation-types";
import {
  buildCustomerCreateInput,
  buildCustomerUpdateInput,
  mapCustomerUserErrors,
} from "../../mappers";
import { customerFormSchema, type CustomerFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  fields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: token.padding,
    "@media (max-width: 640px)": { gridTemplateColumns: "1fr" },
  },
  threeFields: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: token.padding,
    "@media (max-width: 700px)": { gridTemplateColumns: "1fr" },
  },
  fullWidth: { gridColumn: "1 / -1" },
  label: {
    display: "block",
    marginBottom: 6,
    color: token.colorText,
    fontWeight: 500,
  },
  error: { color: token.colorError, fontSize: 12, marginTop: 4 },
  help: { color: token.colorTextSecondary, fontSize: 13, marginTop: 4 },
  switchRow: {
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: token.paddingSM,
    "@media (max-width: 720px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
    "@media (max-width: 440px)": { gridTemplateColumns: "1fr" },
  },
  metric: {
    minWidth: 0,
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
  metricValue: { margin: "0 !important" },
  moderationInfo: {
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    background: token.colorFillAlter,
  },
}));

const DEFAULT_VALUES: CustomerFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  status: CustomerStatus.Active,
  locale: "en",
  taxExempt: false,
  tags: [],
  note: "",
  emailMarketingState: CustomerMarketingState.NotSubscribed,
  smsMarketingState: CustomerMarketingState.NotSubscribed,
  segmentIds: [],
  defaultAddress: {
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    countryCode: "",
  },
  blockedReason: "",
  moderationNote: "",
};

const statusCopy: Record<CustomerStatus, { title: string; description: string; color: string }> = {
  [CustomerStatus.Active]: {
    title: "Active",
    description: "The customer can place orders and receive permitted communications.",
    color: "green",
  },
  [CustomerStatus.Disabled]: {
    title: "Disabled",
    description: "The profile stays available to operators, but new customer activity is paused.",
    color: "default",
  },
  [CustomerStatus.Blocked]: {
    title: "Blocked",
    description: "New orders require operator review and marketing messages are suppressed.",
    color: "red",
  },
};

const marketingOptions = [
  { value: CustomerMarketingState.Subscribed, label: "Subscribed" },
  { value: CustomerMarketingState.NotSubscribed, label: "Not subscribed" },
  { value: CustomerMarketingState.Pending, label: "Pending confirmation" },
];

const customerDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatMoney(amountMinor: number, currency: string | null): string {
  if (!currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amountMinor / 100);
}

export function CustomerModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const defaultCurrency = useDefaultCurrency();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as CustomerModalPayload;
  const isEdit = typedPayload.mode === "edit";
  const customerQuery = useCustomer(isEdit ? typedPayload.entityId : undefined);
  const editorContext = useCustomerEditorContext();
  const { createCustomer, loading: creating, error: createError } = useCreateCustomer();
  const { updateCustomer, loading: updating, error: updateError } = useUpdateCustomer();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);

  const methods = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isValid },
  } = methods;
  const status = useWatch({ control, name: "status" });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  useEffect(() => {
    if (!isEdit || !customerQuery.customer) return;
    const customer = customerQuery.customer;
    reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone ?? "",
      status: customer.status,
      locale: customer.locale,
      taxExempt: customer.taxExempt,
      tags: customer.tags,
      note: customer.note ?? "",
      emailMarketingState: customer.emailMarketingState,
      smsMarketingState: customer.smsMarketingState,
      segmentIds: customer.segments.map((segment) => segment.id),
      defaultAddress: {
        address1: customer.defaultAddress?.address1 ?? "",
        address2: customer.defaultAddress?.address2 ?? "",
        city: customer.defaultAddress?.city ?? "",
        province: customer.defaultAddress?.province ?? "",
        postalCode: customer.defaultAddress?.postalCode ?? "",
        countryCode: customer.defaultAddress?.countryCode ?? "",
      },
      blockedReason: customer.moderation.blockedReason ?? "",
      moderationNote: customer.moderation.moderationNote ?? "",
    });
  }, [customerQuery.customer, isEdit, reset]);

  const segmentOptions = useMemo(
    () => editorContext.context?.segments.map((segment) => ({
      value: segment.id,
      label: segment.name,
    })) ?? [],
    [editorContext.context?.segments],
  );
  const countryOptions = useMemo(
    () => shopCountries.map((country) => ({ value: country.value, label: country.name })),
    [],
  );
  const localeOptions = useMemo(
    () => shopLocales.map((locale) => ({ value: locale.value, label: locale.name })),
    [],
  );

  const onSubmit = useCallback(async (values: CustomerFormValues) => {
    setGlobalErrors([]);
    clearErrors();
    const current = customerQuery.customer;
    const result = isEdit && current
      ? await updateCustomer(buildCustomerUpdateInput(values, current))
      : await createCustomer(buildCustomerCreateInput(values));

    if (!result.customer || result.userErrors.length > 0) {
      const global: string[] = [];
      mapCustomerUserErrors(result.userErrors).forEach((error) => {
        if (error.field) setError(error.field, { message: error.message });
        else global.push(error.message);
      });
      setGlobalErrors(global);
      return;
    }

    await typedPayload.onSaved?.();
    setDirty(false);
    message.success(isEdit ? "Customer updated" : "Customer created");
    forcePop();
  }, [clearErrors, createCustomer, customerQuery.customer, forcePop, isEdit, message, setDirty, setError, typedPayload, updateCustomer]);

  const loading = editorContext.loading || (isEdit && customerQuery.loading);
  const saving = creating || updating;
  const transportError = editorContext.error ?? customerQuery.error ?? createError ?? updateError;
  const title = isEdit ? "Edit customer" : "New customer";
  const currentStatus = statusCopy[status];
  const customer = customerQuery.customer;

  if (loading) {
    return (
      <ModalLayout
        name="customer-editor"
        header={<ModalHeader title={title} onClose={pop} submitButtonProps={{ disabled: true }} />}
      >
        <Skeleton active paragraph={{ rows: 14 }} />
      </ModalLayout>
    );
  }

  if (isEdit && !customer) {
    return (
      <ModalLayout name="customer-editor" headerProps={{ title, onClose: pop, submitButtonProps: null }}>
        <Alert type="error" showIcon message="Customer not found" />
      </ModalLayout>
    );
  }

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="customer-editor"
        header={
          <ModalHeader
            name="customer-editor"
            title={title}
            onClose={pop}
            extra={<Tag color={currentStatus.color}>{currentStatus.title}</Tag>}
            submitButtonProps={{
              children: isEdit ? "Save" : "Create",
              loading: saving,
              disabled: saving || !isValid || (isEdit && !isDirty),
              onClick: handleSubmit(onSubmit),
            }}
          />
        }
      >
        {transportError ? <Alert type="error" showIcon message={transportError.message} /> : null}
        {globalErrors.length > 0 ? (
          <Alert
            type="error"
            showIcon
            message="Could not save customer"
            description={globalErrors.join(" ")}
          />
        ) : null}

        <Paper>
          <PaperHeader title="Customer information" icon={<UserOutlined />} />
          <div className={styles.fields}>
            <div>
              <label className={styles.label} htmlFor="customer-first-name">First name *</label>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="customer-first-name" status={errors.firstName ? "error" : undefined} />
                )}
              />
              {errors.firstName ? <div className={styles.error}>{errors.firstName.message}</div> : null}
            </div>
            <div>
              <label className={styles.label} htmlFor="customer-last-name">Last name *</label>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="customer-last-name" status={errors.lastName ? "error" : undefined} />
                )}
              />
              {errors.lastName ? <div className={styles.error}>{errors.lastName.message}</div> : null}
            </div>
            <div>
              <label className={styles.label} htmlFor="customer-email"><MailOutlined /> Email *</label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="customer-email" type="email" status={errors.email ? "error" : undefined} />
                )}
              />
              {errors.email ? <div className={styles.error}>{errors.email.message}</div> : null}
            </div>
            <div>
              <label className={styles.label} htmlFor="customer-phone"><PhoneOutlined /> Phone</label>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="customer-phone" type="tel" status={errors.phone ? "error" : undefined} />
                )}
              />
              {errors.phone ? <div className={styles.error}>{errors.phone.message}</div> : null}
            </div>
          </div>
        </Paper>

        <Paper>
          <PaperHeader title="Relationships" icon={<TeamOutlined />} />
          <Flex vertical gap="middle">
            <div>
              <label className={styles.label} htmlFor="customer-segments">Segments</label>
              <Controller
                name="segmentIds"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    id="customer-segments"
                    mode="multiple"
                    allowClear
                    options={segmentOptions}
                    placeholder="Assign customer segments"
                    status={errors.segmentIds ? "error" : undefined}
                    style={{ width: "100%" }}
                  />
                )}
              />
              {errors.segmentIds ? <div className={styles.error}>{errors.segmentIds.message}</div> : null}
            </div>
            <Typography.Text strong><EnvironmentOutlined /> Default address</Typography.Text>
            <div className={styles.fields}>
              <div className={styles.fullWidth}>
                <label className={styles.label} htmlFor="customer-address-1">Address</label>
                <Controller
                  name="defaultAddress.address1"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} id="customer-address-1" placeholder="Street and house number" status={errors.defaultAddress?.address1 ? "error" : undefined} />
                  )}
                />
                {errors.defaultAddress?.address1 ? <div className={styles.error}>{errors.defaultAddress.address1.message}</div> : null}
              </div>
              <div className={styles.fullWidth}>
                <label className={styles.label} htmlFor="customer-address-2">Apartment, suite, etc.</label>
                <Controller name="defaultAddress.address2" control={control} render={({ field }) => <Input {...field} id="customer-address-2" />} />
              </div>
            </div>
            <div className={styles.threeFields}>
              <div>
                <label className={styles.label} htmlFor="customer-city">City</label>
                <Controller
                  name="defaultAddress.city"
                  control={control}
                  render={({ field }) => <Input {...field} id="customer-city" status={errors.defaultAddress?.city ? "error" : undefined} />}
                />
                {errors.defaultAddress?.city ? <div className={styles.error}>{errors.defaultAddress.city.message}</div> : null}
              </div>
              <div>
                <label className={styles.label} htmlFor="customer-province">State / province</label>
                <Controller name="defaultAddress.province" control={control} render={({ field }) => <Input {...field} id="customer-province" />} />
              </div>
              <div>
                <label className={styles.label} htmlFor="customer-postal-code">Postal code</label>
                <Controller
                  name="defaultAddress.postalCode"
                  control={control}
                  render={({ field }) => <Input {...field} id="customer-postal-code" status={errors.defaultAddress?.postalCode ? "error" : undefined} />}
                />
                {errors.defaultAddress?.postalCode ? <div className={styles.error}>{errors.defaultAddress.postalCode.message}</div> : null}
              </div>
            </div>
            <div>
              <label className={styles.label} htmlFor="customer-country">Country</label>
              <Controller
                name="defaultAddress.countryCode"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    id="customer-country"
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    options={countryOptions}
                    placeholder="Select country"
                    status={errors.defaultAddress?.countryCode ? "error" : undefined}
                    style={{ width: "100%" }}
                  />
                )}
              />
              {errors.defaultAddress?.countryCode ? <div className={styles.error}>{errors.defaultAddress.countryCode.message}</div> : null}
            </div>
          </Flex>
        </Paper>

        <Paper>
          <PaperHeader title="Additional data" />
          <div className={styles.fields}>
            <div>
              <label className={styles.label} htmlFor="customer-locale">Preferred locale *</label>
              <Controller
                name="locale"
                control={control}
                render={({ field }) => (
                  <Select {...field} id="customer-locale" showSearch optionFilterProp="label" options={localeOptions} style={{ width: "100%" }} />
                )}
              />
            </div>
            <div>
              <label className={styles.label} htmlFor="customer-tags">Tags</label>
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <Select {...field} id="customer-tags" mode="tags" tokenSeparators={[","]} placeholder="Add operator tags" style={{ width: "100%" }} />
                )}
              />
              {errors.tags ? <div className={styles.error}>{errors.tags.message}</div> : null}
            </div>
            <div className={styles.fullWidth}>
              <label className={styles.label} htmlFor="customer-note">Internal note</label>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <Input.TextArea {...field} id="customer-note" autoSize={{ minRows: 3, maxRows: 7 }} maxLength={2000} showCount status={errors.note ? "error" : undefined} />
                )}
              />
              {errors.note ? <div className={styles.error}>{errors.note.message}</div> : <div className={styles.help}>Visible only to store operators.</div>}
            </div>
            <Flex align="center" justify="space-between" gap="middle" className={`${styles.fullWidth} ${styles.switchRow}`}>
              <div>
                <Typography.Text strong>Tax exempt</Typography.Text>
                <br />
                <Typography.Text type="secondary">Use only when the customer has a verified exemption.</Typography.Text>
              </div>
              <Controller name="taxExempt" control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} />
            </Flex>
          </div>
        </Paper>

        <Paper>
          <PaperHeader title="Activity & marketing" icon={<ShoppingOutlined />} />
          <Flex vertical gap="middle">
            <div className={styles.metricGrid}>
              <Flex vertical gap={4} className={styles.metric}>
                <Typography.Text type="secondary">Orders</Typography.Text>
                <Typography.Title level={4} className={styles.metricValue}>{customer?.activity.ordersCount ?? 0}</Typography.Title>
              </Flex>
              <Flex vertical gap={4} className={styles.metric}>
                <Typography.Text type="secondary">Total spent</Typography.Text>
                <Typography.Title level={4} className={styles.metricValue}>{formatMoney(customer?.activity.totalSpentMinor ?? 0, defaultCurrency)}</Typography.Title>
              </Flex>
              <Flex vertical gap={4} className={styles.metric}>
                <Typography.Text type="secondary">Returns</Typography.Text>
                <Typography.Title level={4} className={styles.metricValue}>{customer?.activity.returnsCount ?? 0}</Typography.Title>
              </Flex>
              <Flex vertical gap={4} className={styles.metric}>
                <Typography.Text type="secondary">Last order</Typography.Text>
                <Typography.Title level={5} className={styles.metricValue}>
                  {customer?.activity.lastOrderAt ? customerDateFormatter.format(new Date(customer.activity.lastOrderAt)) : "No orders"}
                </Typography.Title>
              </Flex>
            </div>
            <div className={styles.fields}>
              <div>
                <label className={styles.label} htmlFor="customer-email-marketing"><MailOutlined /> Email marketing</label>
                <Controller
                  name="emailMarketingState"
                  control={control}
                  render={({ field }) => <Select {...field} id="customer-email-marketing" options={marketingOptions} style={{ width: "100%" }} />}
                />
              </div>
              <div>
                <label className={styles.label} htmlFor="customer-sms-marketing"><PhoneOutlined /> SMS marketing</label>
                <Controller
                  name="smsMarketingState"
                  control={control}
                  render={({ field }) => <Select {...field} id="customer-sms-marketing" options={marketingOptions} style={{ width: "100%" }} />}
                />
              </div>
            </div>
            <Typography.Text type="secondary">Consent status is stored explicitly and never inferred from contact details.</Typography.Text>
          </Flex>
        </Paper>

        <Paper>
          <PaperHeader title="Status & moderation" icon={<StopOutlined />} />
          <Flex vertical gap="middle">
            <div>
              <label className={styles.label}>Customer status</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Segmented
                    block
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: CustomerStatus.Active, label: "Active", icon: <CheckCircleOutlined /> },
                      { value: CustomerStatus.Disabled, label: "Disabled", icon: <ClockCircleOutlined /> },
                      { value: CustomerStatus.Blocked, label: "Blocked", icon: <StopOutlined /> },
                    ]}
                  />
                )}
              />
            </div>
            <div className={styles.moderationInfo}>
              <Typography.Text strong>{currentStatus.title}</Typography.Text>
              <br />
              <Typography.Text type="secondary">{currentStatus.description}</Typography.Text>
            </div>
            {status === CustomerStatus.Blocked ? (
              <div>
                <label className={styles.label} htmlFor="customer-blocked-reason"><CloseCircleOutlined /> Block reason *</label>
                <Controller
                  name="blockedReason"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea {...field} id="customer-blocked-reason" autoSize={{ minRows: 2, maxRows: 5 }} maxLength={500} status={errors.blockedReason ? "error" : undefined} />
                  )}
                />
                {errors.blockedReason ? <div className={styles.error}>{errors.blockedReason.message}</div> : null}
              </div>
            ) : null}
            <div>
              <label className={styles.label} htmlFor="customer-moderation-note">Internal moderation note</label>
              <Controller
                name="moderationNote"
                control={control}
                render={({ field }) => (
                  <Input.TextArea {...field} id="customer-moderation-note" autoSize={{ minRows: 3, maxRows: 7 }} maxLength={2000} showCount status={errors.moderationNote ? "error" : undefined} />
                )}
              />
              {errors.moderationNote ? <div className={styles.error}>{errors.moderationNote.message}</div> : <div className={styles.help}>Document decisions for support and fraud-review teams.</div>}
            </div>
          </Flex>
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
