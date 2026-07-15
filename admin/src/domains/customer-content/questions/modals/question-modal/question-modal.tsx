"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Button, Flex, Input, Segmented, Select, Skeleton, Switch, Tag, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DislikeOutlined,
  FlagOutlined,
  LikeOutlined,
  MessageOutlined,
  PlusOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { QuestionModalPayload } from "../../modals";
import { useCreateQuestion, useQuestion, useQuestionEditorContext, useUpdateQuestion } from "../../hooks";
import {
  QuestionAnswerAuthorType,
  QuestionReportReason,
  QuestionStatus,
} from "../../graphql/operation-types";
import { buildQuestionCreateInput, buildQuestionUpdateInput, mapQuestionUserErrors } from "../../mappers";
import { questionFormSchema, type QuestionFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  fields: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: token.padding, "@media (max-width: 640px)": { gridTemplateColumns: "1fr" } },
  fullWidth: { gridColumn: "1 / -1" },
  label: { display: "block", marginBottom: 6, color: token.colorText, fontWeight: 500 },
  error: { color: token.colorError, fontSize: 12, marginTop: 4 },
  help: { color: token.colorTextSecondary, fontSize: 13, marginTop: 4 },
  answerCard: { padding: token.padding, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, background: token.colorFillAlter },
  answerHeader: { marginBottom: token.paddingSM },
  answerSignals: { paddingTop: token.paddingXS },
  moderationInfo: { padding: token.paddingSM, borderRadius: token.borderRadius, background: token.colorFillAlter },
  engagementGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: token.paddingSM, "@media (max-width: 640px)": { gridTemplateColumns: "1fr" } },
  engagementMetric: { padding: token.paddingSM, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, background: token.colorFillAlter },
  metricIcon: { color: token.colorTextSecondary, fontSize: 18 },
  metricValue: { margin: "0 !important" },
  reportsList: { overflow: "hidden", border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius },
  reportRow: { padding: token.paddingSM, borderBottom: `1px solid ${token.colorBorderSecondary}`, "&:last-child": { borderBottom: 0 } },
}));

const DEFAULT_VALUES: QuestionFormValues = {
  productId: "",
  customerId: "",
  body: "",
  status: QuestionStatus.Pending,
  moderationNote: "",
  answers: [],
};

const moderationCopy: Record<QuestionStatus, { title: string; description: string; color: string }> = {
  [QuestionStatus.Pending]: { title: "Pending review", description: "Hidden from the storefront until a moderator makes a decision.", color: "gold" },
  [QuestionStatus.Published]: { title: "Published", description: "Visible on the product page and available for answers.", color: "green" },
  [QuestionStatus.Rejected]: { title: "Rejected", description: "Hidden from customers and closed for answers.", color: "red" },
};

const reportReasonCopy: Record<QuestionReportReason, string> = {
  [QuestionReportReason.Spam]: "Spam or promotion",
  [QuestionReportReason.Offensive]: "Offensive content",
  [QuestionReportReason.ConflictOfInterest]: "Conflict of interest",
  [QuestionReportReason.NotRelevant]: "Not relevant to product",
  [QuestionReportReason.Other]: "Other",
};

const reportDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function QuestionModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as QuestionModalPayload;
  const isEdit = typedPayload.mode === "edit";
  const questionQuery = useQuestion(isEdit ? typedPayload.entityId : undefined);
  const editorContext = useQuestionEditorContext();
  const { createQuestion, loading: creating, error: createError } = useCreateQuestion();
  const { updateQuestion, loading: updating, error: updateError } = useUpdateQuestion();
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const methods = useForm<QuestionFormValues>({ resolver: zodResolver(questionFormSchema), defaultValues: DEFAULT_VALUES, mode: "onChange" });
  const { control, handleSubmit, reset, setError, clearErrors, formState: { errors, isDirty, isValid } } = methods;
  const { fields: answerFields, append: appendAnswer, remove: removeAnswer } = useFieldArray({ control, name: "answers", keyName: "fieldKey" });
  const status = useWatch({ control, name: "status" });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);
  useEffect(() => {
    const question = questionQuery.question;
    if (!isEdit || !question) return;
    reset({
      productId: question.product.id,
      customerId: question.customer.id,
      body: question.body,
      status: question.status,
      moderationNote: question.moderationNote ?? "",
      answers: question.answers.map((answer) => ({
        id: answer.id,
        body: answer.body,
        authorType: answer.authorType,
        authorName: answer.authorName,
        isOfficial: answer.isOfficial,
      })),
    });
  }, [isEdit, questionQuery.question, reset]);

  const productOptions = useMemo(() => editorContext.context?.products.map((product) => ({ value: product.id, label: product.title })) ?? [], [editorContext.context?.products]);
  const customerOptions = useMemo(() => editorContext.context?.customers.map((customer) => ({ value: customer.id, label: `${customer.displayName} · ${customer.email}` })) ?? [], [editorContext.context?.customers]);

  const addAnswer = useCallback(() => appendAnswer({
    body: "",
    authorType: QuestionAnswerAuthorType.Staff,
    authorName: "Shopana Support",
    isOfficial: true,
  }), [appendAnswer]);

  const onSubmit = useCallback(async (values: QuestionFormValues) => {
    setGlobalErrors([]);
    clearErrors();
    const current = questionQuery.question;
    const result = isEdit && current
      ? await updateQuestion(buildQuestionUpdateInput(values, current))
      : await createQuestion(buildQuestionCreateInput(values));
    if (!result.question || result.userErrors.length) {
      const global: string[] = [];
      mapQuestionUserErrors(result.userErrors).forEach((error) => {
        if (error.field) setError(error.field, { message: error.message });
        else global.push(error.message);
      });
      setGlobalErrors(global);
      return;
    }
    await typedPayload.onSaved?.();
    setDirty(false);
    message.success(isEdit ? "Question updated" : "Question created");
    forcePop();
  }, [clearErrors, createQuestion, forcePop, isEdit, message, questionQuery.question, setDirty, setError, typedPayload, updateQuestion]);

  const loading = editorContext.loading || (isEdit && questionQuery.loading);
  const saving = creating || updating;
  const transportError = editorContext.error ?? questionQuery.error ?? createError ?? updateError;
  const title = isEdit ? "Edit question" : "New question";
  const moderation = moderationCopy[status];

  if (loading) return <ModalLayout name="question-editor" header={<ModalHeader title={title} onClose={pop} submitButtonProps={{ disabled: true }} />}><Skeleton active paragraph={{ rows: 12 }} /></ModalLayout>;
  if (isEdit && !questionQuery.question) return <ModalLayout name="question-editor" headerProps={{ title, onClose: pop, submitButtonProps: null }}><Alert type="error" showIcon message="Question not found" /></ModalLayout>;

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="question-editor"
        header={<ModalHeader
          name="question-editor"
          title={title}
          onClose={pop}
          extra={<Tag color={moderation.color}>{moderation.title}</Tag>}
          submitButtonProps={{ children: isEdit ? "Save" : "Create", loading: saving, disabled: saving || !isValid || (isEdit && !isDirty), onClick: handleSubmit(onSubmit) }}
        />}
      >
        {transportError ? <Alert type="error" showIcon message={transportError.message} /> : null}
        {globalErrors.length ? <Alert type="error" showIcon message="Could not save question" description={globalErrors.join(" ")} /> : null}

        <Paper>
          <PaperHeader title="Associations" />
          <div className={styles.fields}>
            <div>
              <label className={styles.label} htmlFor="question-product"><ShoppingOutlined /> Product *</label>
              <Controller name="productId" control={control} render={({ field }) => <Select {...field} id="question-product" showSearch optionFilterProp="label" options={productOptions} placeholder="Select product" status={errors.productId ? "error" : undefined} style={{ width: "100%" }} />} />
              {errors.productId ? <div className={styles.error}>{errors.productId.message}</div> : null}
            </div>
            <div>
              <label className={styles.label} htmlFor="question-customer"><UserOutlined /> Customer *</label>
              <Controller name="customerId" control={control} render={({ field }) => <Select {...field} id="question-customer" showSearch optionFilterProp="label" options={customerOptions} placeholder="Select customer" status={errors.customerId ? "error" : undefined} style={{ width: "100%" }} />} />
              {errors.customerId ? <div className={styles.error}>{errors.customerId.message}</div> : null}
            </div>
          </div>
        </Paper>

        <Paper>
          <PaperHeader title="Question content" />
          <label className={styles.label} htmlFor="question-body">Question *</label>
          <Controller name="body" control={control} render={({ field }) => <Input.TextArea {...field} id="question-body" autoSize={{ minRows: 4, maxRows: 10 }} maxLength={5000} showCount placeholder="Enter the customer's product question" status={errors.body ? "error" : undefined} />} />
          {errors.body ? <div className={styles.error}>{errors.body.message}</div> : null}
        </Paper>

        <Paper>
          <PaperHeader title="Answers" extra={<Button size="small" icon={<PlusOutlined />} onClick={addAnswer}>Add answer</Button>} />
          <Flex vertical gap="middle">
            {answerFields.length ? answerFields.map((answerField, index) => {
              const persisted = questionQuery.question?.answers.find((answer) => answer.id === answerField.id);
              return (
                <div className={styles.answerCard} key={answerField.fieldKey}>
                  <Flex justify="space-between" align="center" className={styles.answerHeader}>
                    <Flex align="center" gap="small"><MessageOutlined /><Typography.Text strong>Answer {index + 1}</Typography.Text></Flex>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeAnswer(index)}>Remove</Button>
                  </Flex>
                  <Flex vertical gap="middle">
                    <div>
                      <label className={styles.label} htmlFor={`question-answer-${index}`}>Answer *</label>
                      <Controller name={`answers.${index}.body`} control={control} render={({ field }) => <Input.TextArea {...field} id={`question-answer-${index}`} autoSize={{ minRows: 3, maxRows: 8 }} maxLength={5000} showCount status={errors.answers?.[index]?.body ? "error" : undefined} />} />
                      {errors.answers?.[index]?.body ? <div className={styles.error}>{errors.answers[index]?.body?.message}</div> : null}
                    </div>
                    <div className={styles.fields}>
                      <div>
                        <label className={styles.label}>Author type *</label>
                        <Controller name={`answers.${index}.authorType`} control={control} render={({ field }) => <Select {...field} style={{ width: "100%" }} options={[{ value: QuestionAnswerAuthorType.Seller, label: "Seller" }, { value: QuestionAnswerAuthorType.Staff, label: "Staff" }, { value: QuestionAnswerAuthorType.Customer, label: "Customer" }]} />} />
                      </div>
                      <div>
                        <label className={styles.label}>Author name *</label>
                        <Controller name={`answers.${index}.authorName`} control={control} render={({ field }) => <Input {...field} status={errors.answers?.[index]?.authorName ? "error" : undefined} />} />
                        {errors.answers?.[index]?.authorName ? <div className={styles.error}>{errors.answers[index]?.authorName?.message}</div> : null}
                      </div>
                    </div>
                    <Flex justify="space-between" align="center" gap="middle">
                      <Flex vertical><Typography.Text strong>Official answer</Typography.Text><Typography.Text type="secondary">Display as an answer from the store.</Typography.Text></Flex>
                      <Controller name={`answers.${index}.isOfficial`} control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} />
                    </Flex>
                    {persisted ? <Flex gap="middle" className={styles.answerSignals}><Typography.Text type="secondary"><LikeOutlined /> {persisted.likeCount}</Typography.Text><Typography.Text type="secondary"><DislikeOutlined /> {persisted.dislikeCount}</Typography.Text></Flex> : null}
                  </Flex>
                </div>
              );
            }) : <Typography.Text type="secondary">No answers yet. Add an official store response when the information is verified.</Typography.Text>}
            {errors.answers?.root ? <div className={styles.error}>{errors.answers.root.message}</div> : null}
          </Flex>
        </Paper>

        <Paper>
          <PaperHeader title="Engagement & abuse reports" />
          <Flex vertical gap="middle">
            <div className={styles.engagementGrid}>
              <Flex vertical gap={4} className={styles.engagementMetric}><Flex align="center" gap="small"><LikeOutlined className={styles.metricIcon} /><Typography.Text strong>Likes</Typography.Text></Flex><Typography.Title level={4} className={styles.metricValue}>{questionQuery.question?.likeCount ?? 0}</Typography.Title><Typography.Text type="secondary">Customers who found the question helpful.</Typography.Text></Flex>
              <Flex vertical gap={4} className={styles.engagementMetric}><Flex align="center" gap="small"><DislikeOutlined className={styles.metricIcon} /><Typography.Text strong>Dislikes</Typography.Text></Flex><Typography.Title level={4} className={styles.metricValue}>{questionQuery.question?.dislikeCount ?? 0}</Typography.Title><Typography.Text type="secondary">Customers who found the question unhelpful.</Typography.Text></Flex>
              <Flex vertical gap={4} className={styles.engagementMetric}><Flex align="center" gap="small"><FlagOutlined className={styles.metricIcon} /><Typography.Text strong>Abuse reports</Typography.Text></Flex><Typography.Title level={4} className={styles.metricValue}>{questionQuery.question?.reportedCount ?? 0}</Typography.Title><Typography.Text type="secondary">Customers who asked to inspect this question.</Typography.Text></Flex>
            </div>
            {(questionQuery.question?.reports.length ?? 0) > 0 ? (
              <div className={styles.reportsList}>{questionQuery.question?.reports.map((report) => <Flex vertical gap={4} className={styles.reportRow} key={report.id}><Flex align="center" justify="space-between" gap="small" wrap><Flex align="center" gap="small" wrap><Tag color="red">{reportReasonCopy[report.reason]}</Tag><Typography.Text>{report.reporter.displayName}</Typography.Text><Typography.Text type="secondary">{report.reporter.email}</Typography.Text></Flex><Typography.Text type="secondary">{reportDateFormatter.format(new Date(report.createdAt))}</Typography.Text></Flex>{report.details ? <Typography.Text>{report.details}</Typography.Text> : null}</Flex>)}</div>
            ) : <Typography.Text type="secondary">No abuse reports were submitted for this question.</Typography.Text>}
          </Flex>
        </Paper>

        <Paper>
          <PaperHeader title="Moderation" />
          <Flex vertical gap="middle">
            <Controller name="status" control={control} render={({ field }) => <Segmented block value={field.value} onChange={field.onChange} options={[{ value: QuestionStatus.Pending, label: "Pending", icon: <ClockCircleOutlined /> }, { value: QuestionStatus.Published, label: "Published", icon: <CheckCircleOutlined /> }, { value: QuestionStatus.Rejected, label: "Rejected", icon: <CloseCircleOutlined /> }]} />} />
            <div className={styles.moderationInfo}><Typography.Text strong>{moderation.title}</Typography.Text><br /><Typography.Text type="secondary">{moderation.description}</Typography.Text></div>
            <div>
              <label className={styles.label} htmlFor="question-moderation-note">Internal moderation note{status === QuestionStatus.Rejected ? " *" : ""}</label>
              <Controller name="moderationNote" control={control} render={({ field }) => <Input.TextArea {...field} id="question-moderation-note" autoSize={{ minRows: 3, maxRows: 6 }} maxLength={1000} showCount placeholder="Document the decision for other moderators" status={errors.moderationNote ? "error" : undefined} />} />
              {errors.moderationNote ? <div className={styles.error}>{errors.moderationNote.message}</div> : <div className={styles.help}>This note is never shown to customers.</div>}
            </div>
          </Flex>
        </Paper>
      </ModalLayout>
    </FormProvider>
  );
}
