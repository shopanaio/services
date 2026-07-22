"use client";

import { useEffect, useState } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { Alert, App, Button, Input, Select, Typography, Upload } from "antd";
import { createStyles } from "antd-style";
import {
  LuDiamond,
  LuEllipsis,
  LuImage,
  LuPanelTop,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { shopCountries } from "@/defs/localization";
import { useUploadFiles } from "@/domains/media/hooks";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useUpdateGeneralSettings } from "../../hooks";
import {
  mapStoreSettingsInput,
  normalizeStorePhoneNumber,
} from "../../mappers";
import type { EditStoreSettingsModalPayload } from "../../modals";
import type { StoreSettingsFormValues } from "../../types";

const SOCIAL_PLATFORM_OPTIONS = [
  "Instagram",
  "Facebook",
  "X",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Pinterest",
].map((platform) => ({ label: platform, value: platform }));

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: 0,
    overflow: "hidden",
  },
  paperHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    padding: "5px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  paperTitle: {
    lineHeight: "22px",
  },
  paperAction: {
    width: 32,
    height: 32,
    padding: 0,
    background: token.colorBgContainerDisabled,
  },
  paperBody: {
    padding: "14px 16px 16px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: token.margin,
    width: "100%",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: `10px ${token.margin}px`,
    "@media (max-width: 680px)": {
      gridTemplateColumns: "1fr",
    },
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  label: {
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: "20px",
  },
  strongLabel: {
    color: token.colorText,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "22px",
  },
  hint: {
    color: token.colorTextTertiary,
    fontSize: 12,
    lineHeight: "18px",
  },
  error: {
    color: token.colorError,
    fontSize: 12,
    lineHeight: "18px",
  },
  phoneList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  phoneEntry: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  phoneRow: {
    display: "flex",
    gap: 8,
  },
  grow: {
    flex: 1,
  },
  addPhone: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  brandField: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  uploadTarget: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    height: 56,
    marginTop: 6,
    padding: 7,
    overflow: "hidden",
    textAlign: "left",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    cursor: "pointer",
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
    },
  },
  uploadIcon: {
    display: "flex",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    overflow: "hidden",
    color: token.colorPrimary,
    fontSize: 16,
    background: token.colorPrimaryBg,
    borderRadius: token.borderRadius,
  },
  uploadPreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  uploadCopy: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: 600,
    lineHeight: "20px",
  },
  uploadHint: {
    overflow: "hidden",
    color: token.colorTextSecondary,
    fontSize: 11,
    lineHeight: "16px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  colorField: {
    display: "flex",
    alignItems: "center",
    height: 42,
    marginTop: 6,
    padding: "6px 7px",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  },
  colorPicker: {
    flex: "0 0 auto",
    width: 28,
    height: 28,
    padding: 0,
    overflow: "hidden",
    border: 0,
    borderRadius: 5,
    cursor: "pointer",
    "&::-webkit-color-swatch-wrapper": { padding: 0 },
    "&::-webkit-color-swatch": { border: 0, borderRadius: 5 },
  },
  colorText: {
    flex: 1,
    border: 0,
    boxShadow: "none",
    "&:focus, &:hover": {
      border: 0,
      boxShadow: "none",
    },
  },
  socialIntro: {
    marginBottom: 6,
  },
  socialRow: {
    display: "flex",
    gap: 10,
    marginTop: 8,
    "@media (max-width: 680px)": {
      flexDirection: "column",
    },
  },
  socialPlatform: {
    flex: "0 0 180px",
    width: 180,
    "@media (max-width: 680px)": {
      flex: "auto",
      width: "100%",
    },
  },
  socialUrl: {
    flex: 1,
  },
}));

interface FormPaperProps {
  children: React.ReactNode;
  title: string;
}

const FormPaper = ({ children, title }: FormPaperProps) => {
  const { styles } = useStyles();
  return (
    <Paper className={styles.paper}>
      <div className={styles.paperHeader}>
        <Typography.Text strong className={styles.paperTitle}>
          {title}
        </Typography.Text>
        <Button
          aria-label={`${title} actions`}
          className={styles.paperAction}
          icon={<LuEllipsis />}
        />
      </div>
      <div className={styles.paperBody}>{children}</div>
    </Paper>
  );
};

interface BrandUploadProps {
  acceptHint: string;
  icon: IconType;
  imageUrl: string | null;
  loading: boolean;
  onUpload: (file: File) => void;
}

const BrandUpload = ({
  acceptHint,
  icon: UploadIcon,
  imageUrl,
  loading,
  onUpload,
}: BrandUploadProps) => {
  const { styles } = useStyles();
  return (
    <Upload
      accept="image/heic,image/webp,image/svg+xml,image/png,image/jpeg"
      beforeUpload={(file) => {
        onUpload(file);
        return false;
      }}
      disabled={loading}
      showUploadList={false}
    >
      <div className={styles.uploadTarget}>
        <span className={styles.uploadIcon}>
          {imageUrl ? (
            <img alt="" className={styles.uploadPreview} src={imageUrl} />
          ) : (
            <UploadIcon />
          )}
        </span>
        <span className={styles.uploadCopy}>
          <span className={styles.uploadTitle}>
            {loading ? "Uploading…" : imageUrl ? "Change image" : "Upload image"}
          </span>
          <span className={styles.uploadHint}>{acceptHint}</span>
        </span>
      </div>
    </Upload>
  );
};

export const StoreSettingsModal = () => {
  const { styles, cx } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditStoreSettingsModalPayload;
  const { section, store } = typedPayload;
  const updateMutation = useUpdateGeneralSettings();
  const uploadMutation = useUploadFiles();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StoreSettingsFormValues>({
    defaultValues: {
      name: store.contactDetails.name,
      slug: store.contactDetails.slug,
      email: store.contactDetails.email ?? "",
      phoneNumbers: store.contactDetails.phoneNumbers.length
        ? store.contactDetails.phoneNumbers.map((value) => ({ value }))
        : [{ value: "" }],
      companyName: store.address?.companyName ?? "",
      countryCode: store.address?.countryCode ?? "UA",
      addressLine1: store.address?.addressLine1 ?? "",
      addressLine2: store.address?.addressLine2 ?? "",
      city: store.address?.city ?? "",
      administrativeArea: store.address?.administrativeArea ?? "",
      postalCode: store.address?.postalCode ?? "",
      primaryColor: store.brand.primaryColor,
      secondaryColor: store.brand.secondaryColor,
      slogan: store.brand.slogan ?? "",
      shortDescription: store.brand.shortDescription ?? "",
      socialLinks: store.brand.socialLinks.length
        ? store.brand.socialLinks.map(({ platform, url }) => ({ platform, url }))
        : [{ platform: "", url: "" }],
      defaultLogoId: store.brand.defaultLogo?.id ?? null,
      defaultLogoUrl: store.brand.defaultLogo?.url ?? null,
      squareLogoId: store.brand.squareLogo?.id ?? null,
      squareLogoUrl: store.brand.squareLogo?.url ?? null,
      coverImageId: store.brand.coverImage?.id ?? null,
      coverImageUrl: store.brand.coverImage?.url ?? null,
    },
  });
  const phones = useFieldArray({ control, name: "phoneNumbers" });
  const socialLinks = useFieldArray({ control, name: "socialLinks" });
  const brandValues = useWatch({
    control,
    name: [
      "primaryColor",
      "secondaryColor",
      "defaultLogoUrl",
      "squareLogoUrl",
      "coverImageUrl",
    ],
  });
  const [primaryColor, secondaryColor, defaultLogoUrl, squareLogoUrl, coverImageUrl] =
    brandValues;

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const uploadBrandImage = async (
    file: File,
    idField: "defaultLogoId" | "squareLogoId" | "coverImageId",
    urlField: "defaultLogoUrl" | "squareLogoUrl" | "coverImageUrl",
  ) => {
    setSubmitError(null);
    const result = await uploadMutation.uploadFile(file);
    if (!result.file) {
      setSubmitError(
        result.userErrors.map(({ message: errorMessage }) => errorMessage).join("\n") ||
          uploadMutation.error?.message ||
          "The image could not be uploaded.",
      );
      return;
    }
    setValue(idField, result.file.id, { shouldDirty: true });
    setValue(urlField, result.file.url, { shouldDirty: true });
  };

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await updateMutation.updateStore({
      storeId: store.id,
      expectedRevision: store.revision,
      operations: mapStoreSettingsInput(section, values, store),
    });

    const operationErrors = result.operationResults.flatMap(
      ({ applied, errors: errorsForOperation }) =>
        applied ? [] : errorsForOperation,
    );
    const mutationErrors = [...result.userErrors, ...operationErrors];

    if (!result.data || mutationErrors.length > 0) {
      setSubmitError(
        [...new Set(mutationErrors.map(({ message: errorMessage }) => errorMessage))]
          .join("\n") ||
          updateMutation.error?.message ||
          "The store settings could not be saved.",
      );
      return;
    }

    await typedPayload.onSaved?.();
    message.success(section === "brand" ? "Brand updated" : "Store information updated");
    forcePop();
  });

  const textField = (
    name: keyof StoreSettingsFormValues,
    label: string,
    options: {
      fullWidth?: boolean;
      hint?: string;
      placeholder?: string;
      required?: string;
      disabled?: boolean;
    } = {},
  ) => (
    <div className={cx(styles.field, options.fullWidth && styles.fullWidth)}>
      <Typography.Text className={styles.label}>{label}</Typography.Text>
      <Controller
        control={control}
        name={name}
        rules={{ required: options.required }}
        render={({ field }) => (
          <Input
            {...field}
            disabled={options.disabled}
            placeholder={options.placeholder}
            status={errors[name] ? "error" : undefined}
            value={typeof field.value === "string" ? field.value : ""}
          />
        )}
      />
      {options.hint ? <span className={styles.hint}>{options.hint}</span> : null}
      {errors[name] ? (
        <span className={styles.error}>{errors[name]?.message}</span>
      ) : null}
    </div>
  );

  const renderContact = () => (
    <FormPaper title="Store contact details">
      <div className={styles.grid}>
        {textField("name", "Store name", {
          hint: "Appears on your online store.",
          required: "Store name is required",
        })}
        {textField("slug", "Store slug", {
          hint: "Used in storefront URLs and API references.",
          required: "Store slug is required",
        })}
        {textField("email", "Store email", {
          fullWidth: true,
          hint: "Receives messages about your store. For sender email go to notifications settings.",
        })}
        <div className={cx(styles.field, styles.fullWidth)}>
          <Typography.Text className={styles.label}>Phone numbers</Typography.Text>
          <div className={styles.phoneList}>
            {phones.fields.map((phone, index) => (
              <div className={styles.phoneEntry} key={phone.id}>
                <div className={styles.phoneRow}>
                  <Controller
                    control={control}
                    name={`phoneNumbers.${index}.value`}
                    rules={{
                      validate: (value) =>
                        !value ||
                        /^\+[1-9][0-9]{1,14}$/.test(
                          normalizeStorePhoneNumber(value),
                        ) ||
                        "Use an international number starting with +",
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        className={styles.grow}
                        status={
                          errors.phoneNumbers?.[index]?.value
                            ? "error"
                            : undefined
                        }
                      />
                    )}
                  />
                  <Button
                    aria-label={`Remove phone number ${index + 1}`}
                    icon={<LuTrash2 />}
                    onClick={() => phones.remove(index)}
                  />
                </div>
                {errors.phoneNumbers?.[index]?.value ? (
                  <span className={styles.error}>
                    {errors.phoneNumbers[index]?.value?.message}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <Button
            className={styles.addPhone}
            icon={<LuPlus />}
            onClick={() => phones.append({ value: "" })}
            size="small"
            type="link"
          >
            Add phone number
          </Button>
        </div>
      </div>
    </FormPaper>
  );

  const renderAddress = () => (
    <FormPaper title="Store address">
      <div className={styles.grid}>
        {textField("companyName", "Company name", {
          fullWidth: true,
          hint: "Your customers can see this information.",
        })}
        <div className={cx(styles.field, styles.fullWidth)}>
          <Typography.Text className={styles.label}>Country / region</Typography.Text>
          <Input
            disabled
            value={
              shopCountries.find(({ value }) => value === store.address?.countryCode)
                ?.name ?? store.address?.countryCode ?? "Ukraine"
            }
          />
          <span className={styles.hint}>Change country in business details.</span>
        </div>
        {textField("addressLine1", "Address", { fullWidth: true })}
        {textField("addressLine2", "Apartment, suite, etc.", { fullWidth: true })}
        {textField("city", "City")}
        {textField("postalCode", "Postal code")}
      </div>
    </FormPaper>
  );

  const colorField = (
    name: "primaryColor" | "secondaryColor",
    label: string,
    hint: string,
    value: string,
  ) => (
    <div className={styles.brandField}>
      <Typography.Text className={styles.strongLabel}>{label}</Typography.Text>
      <span className={styles.hint}>{hint}</span>
      <div className={styles.colorField}>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <input {...field} className={styles.colorPicker} type="color" />
          )}
        />
        <Controller
          control={control}
          name={name}
          rules={{ required: `${label} color is required` }}
          render={({ field }) => (
            <Input {...field} className={styles.colorText} value={value} />
          )}
        />
      </div>
    </div>
  );

  const renderBrand = () => (
    <>
      <FormPaper title="Logos">
        <div className={styles.grid}>
          <div className={styles.brandField}>
            <Typography.Text className={styles.strongLabel}>Default logo</Typography.Text>
            <span className={styles.hint}>Used for most common logo applications.</span>
            <BrandUpload
              acceptHint="HEIC, WEBP, SVG, PNG or JPG · min. width 512 px"
              icon={LuPanelTop}
              imageUrl={defaultLogoUrl}
              loading={uploadMutation.loading}
              onUpload={(file) =>
                void uploadBrandImage(file, "defaultLogoId", "defaultLogoUrl")
              }
            />
          </div>
          <div className={styles.brandField}>
            <Typography.Text className={styles.strongLabel}>Square logo</Typography.Text>
            <span className={styles.hint}>
              Used by social channels; may be cropped into a circle.
            </span>
            <BrandUpload
              acceptHint="HEIC, WEBP, SVG, PNG or JPG · recommended 512×512"
              icon={LuDiamond}
              imageUrl={squareLogoUrl}
              loading={uploadMutation.loading}
              onUpload={(file) =>
                void uploadBrandImage(file, "squareLogoId", "squareLogoUrl")
              }
            />
          </div>
        </div>
      </FormPaper>

      <FormPaper title="Colors">
        <div className={styles.grid}>
          {colorField(
            "primaryColor",
            "Primary",
            "Brand color used on your store, social media and more.",
            primaryColor,
          )}
          {colorField(
            "secondaryColor",
            "Secondary",
            "Supporting color for accents and additional detail.",
            secondaryColor,
          )}
        </div>
      </FormPaper>

      <FormPaper title="Cover and copy">
        <div className={styles.grid}>
          <div className={cx(styles.brandField, styles.fullWidth)}>
            <Typography.Text className={styles.strongLabel}>Cover image</Typography.Text>
            <span className={styles.hint}>
              Key image representing your brand in profile pages and apps.
            </span>
            <BrandUpload
              acceptHint="HEIC, WEBP, SVG, PNG or JPG · recommended 1920×1080"
              icon={LuImage}
              imageUrl={coverImageUrl}
              loading={uploadMutation.loading}
              onUpload={(file) =>
                void uploadBrandImage(file, "coverImageId", "coverImageUrl")
              }
            />
          </div>
          <div className={styles.brandField}>
            <Typography.Text className={styles.strongLabel}>Slogan</Typography.Text>
            <span className={styles.hint}>
              Brand statement or tagline often used with your logo.
            </span>
            <Controller
              control={control}
              name="slogan"
              render={({ field }) => (
                <Input {...field} placeholder="Made for modern commerce" />
              )}
            />
          </div>
          <div className={styles.brandField}>
            <Typography.Text className={styles.strongLabel}>
              Short description
            </Typography.Text>
            <span className={styles.hint}>
              Description of your business used in bios and listings.
            </span>
            <Controller
              control={control}
              name="shortDescription"
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder="A short introduction to your business"
                />
              )}
            />
          </div>
        </div>
      </FormPaper>

      <FormPaper title="Social links">
        <div className={styles.socialIntro}>
          <span className={styles.hint}>
            Links for your business, often used in the theme footer.
          </span>
        </div>
        {socialLinks.fields.map((socialLink, index) => (
          <div className={styles.socialRow} key={socialLink.id}>
            <Controller
              control={control}
              name={`socialLinks.${index}.platform`}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  className={styles.socialPlatform}
                  options={SOCIAL_PLATFORM_OPTIONS}
                  placeholder="Instagram"
                />
              )}
            />
            <Controller
              control={control}
              name={`socialLinks.${index}.url`}
              rules={{
                validate: (value) =>
                  !value || URL.canParse(value) || "Enter a valid URL",
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  className={styles.socialUrl}
                  placeholder="https://instagram.com/shopana"
                  status={errors.socialLinks?.[index]?.url ? "error" : undefined}
                />
              )}
            />
          </div>
        ))}
      </FormPaper>
    </>
  );

  return (
    <ModalLayout
      name={`store-settings-${section}`}
      header={
        <ModalHeader
          name={`store-settings-${section}`}
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty || uploadMutation.loading,
            loading: updateMutation.loading,
            onClick: submit,
          }}
          title={section === "brand" ? "Brand" : "Edit store information"}
        />
      }
    >
      {submitError ? <Alert message={submitError} showIcon type="error" /> : null}
      <form className={styles.form} onSubmit={submit}>
        {section === "contact" ? renderContact() : null}
        {section === "address" ? renderAddress() : null}
        {section === "brand" ? renderBrand() : null}
      </form>
    </ModalLayout>
  );
};
