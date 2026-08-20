"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Flex,
  Input,
  Segmented,
  Select,
  Skeleton,
  Typography,
} from "antd";
import {
  LuCircleCheck as CheckCircleOutlined,
  LuClock as ClockCircleOutlined,
  LuCircleX as CloseCircleOutlined,
  LuTrash2 as DeleteOutlined,
  LuPlus as PlusOutlined,
  LuShoppingBag as ShoppingOutlined,
  LuUser as UserOutlined,
} from "react-icons/lu";
import type { ApiProductQuestionUpdateInput } from "@/graphql/types";
import { ReviewContentAuthorType, ReviewContentStatus } from "@/graphql/types";
import { shopLocales } from "@/defs/localization";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useEntityPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import "@/shared/components/entity-picker-modal/configs/product-picker-config";
import "@/domains/customers/all-customers/picker/customer-picker-config";
import { useQuestion, useUpdateQuestion } from "../../hooks";
import type { QuestionAnswerMutationPlan } from "../../mappers/question-form.mapper";
import type { QuestionEditModalPayload, QuestionEditSection } from "../../modals";

interface AnswerDraft {
  id?: string;
  revision?: number;
  body: string;
  locale: string;
  authorType: ReviewContentAuthorType;
  customerId?: string | null;
  authorName: string;
  authorEmail: string;
  isOfficial: boolean;
  isAccepted: boolean;
}
const sectionTitle: Record<QuestionEditSection, string> = {
  content: "Question content",
  moderation: "Question moderation",
  answers: "Question answers",
};

export function QuestionEditModal() {
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as QuestionEditModalPayload;
  const section = value.section ?? "content";
  const query = useQuestion(value.entityId);
  const mutation = useUpdateQuestion();
  const question = query.question;
  const [product, setProduct] = useState<IPickableEntity | null>(null);
  const [customer, setCustomer] = useState<IPickableEntity | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [locale, setLocale] = useState("en");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState(ReviewContentStatus.Pending);
  const [moderationNote, setModerationNote] = useState("");
  const [answers, setAnswers] = useState<AnswerDraft[]>([]);
  const [originalAnswerIds, setOriginalAnswerIds] = useState<string[]>([]);
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null);
  const [dirty, setLocalDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  const change = () => setLocalDirty(true);
  if (question && loadedRevision !== question.revision) {
    setLoadedRevision(question.revision);
    setProduct({ id: question.product.id, title: question.product.title });
    setCustomer(
      question.author.customer
        ? { id: question.author.customer.id, title: question.author.customer.displayName }
        : null,
    );
    setAuthorName(question.author.displayName);
    setAuthorEmail(question.author.email ?? "");
    setLocale(question.locale);
    setBody(question.body);
    setStatus(question.status);
    setModerationNote(question.moderationNote ?? "");
    const drafts = question.answers.edges.map(({ node }) => ({
      id: node.id,
      revision: node.revision,
      body: node.body,
      locale: node.locale,
      authorType: node.author.type,
      customerId: node.author.customer?.id,
      authorName: node.author.displayName,
      authorEmail: node.author.email ?? "",
      isOfficial: node.isOfficial,
      isAccepted: node.isAccepted,
    }));
    setAnswers(drafts);
    setOriginalAnswerIds(drafts.flatMap((item) => (item.id ? [item.id] : [])));
    setLocalDirty(false);
  }
  const productPicker = useEntityPicker<IPickableEntity>({
    entityType: "product",
    selectionMode: "single",
    initialSelection: product ? [product.id] : [],
    onConfirm: (items) => {
      setProduct(items[0] ?? null);
      change();
    },
  });
  const customerPicker = useEntityPicker<IPickableEntity>({
    entityType: "customer",
    selectionMode: "single",
    initialSelection: customer ? [customer.id] : [],
    allowEmptySelection: true,
    onConfirm: (items) => {
      const item = items[0] ?? null;
      setCustomer(item);
      if (item) setAuthorName(item.title);
      change();
    },
  });
  const updateAnswer = <K extends keyof AnswerDraft>(
    index: number,
    key: K,
    next: AnswerDraft[K],
  ) => {
    setAnswers((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: next } : item)),
    );
    change();
  };
  const buildAnswerPlan = (): QuestionAnswerMutationPlan => ({
    create: answers
      .filter((item) => !item.id)
      .map((item, sortIndex) => ({
        content: {
          body: item.body.trim(),
          locale: item.locale,
          author: {
            type: item.authorType,
            customerId: item.customerId ?? null,
            displayName: item.authorName.trim(),
            email: item.authorEmail.trim() || null,
          },
          source: { channel: "ADMIN" },
          status: question?.status ?? ReviewContentStatus.Pending,
        },
        isOfficial: item.isOfficial,
        isAccepted: item.isAccepted,
        sortIndex,
      })),
    update: answers.flatMap((item, sortIndex) =>
      item.id && item.revision
        ? [
            {
              answerId: item.id,
              expectedRevision: item.revision,
              operations: {
                content: {
                  text: { body: item.body.trim(), locale: item.locale },
                  author: {
                    type: item.authorType,
                    customerId: item.customerId ?? null,
                    displayName: item.authorName.trim(),
                    email: item.authorEmail.trim() || null,
                  },
                },
                properties: { isOfficial: item.isOfficial, isAccepted: item.isAccepted, sortIndex },
              },
            },
          ]
        : [],
    ),
    delete: originalAnswerIds
      .filter((id) => !answers.some((item) => item.id === id))
      .flatMap((id) => {
        const source = question?.answers.edges.find(({ node }) => node.id === id)?.node;
        return source ? [{ answerId: id, expectedRevision: source.revision }] : [];
      }),
  });
  const save = async () => {
    if (!question) return;
    setError(null);
    let operations: ApiProductQuestionUpdateInput = {};
    let answerPlan: QuestionAnswerMutationPlan = { create: [], update: [], delete: [] };
    if (section === "content") {
      if (!product || !body.trim() || !authorName.trim())
        return setError("Product, author and question are required.");
      operations = {
        content: {
          text: { body: body.trim(), locale },
          author: {
            type: customer ? ReviewContentAuthorType.Customer : question.author.type,
            customerId: customer?.id ?? null,
            displayName: authorName.trim(),
            email: authorEmail.trim() || null,
          },
        },
        subject: { productId: product.id },
      };
    } else if (section === "moderation")
      operations = {
        content: { moderation: { status, moderationNote: moderationNote.trim() || null } },
      };
    else {
      if (answers.some((item) => item.body.trim().length < 10 || !item.authorName.trim()))
        return setError("Every answer needs an author and at least 10 characters.");
      answerPlan = buildAnswerPlan();
    }
    const result = await mutation.updateQuestion(
      question.id,
      question.revision,
      operations,
      answerPlan,
    );
    if (!result.question || result.userErrors.length)
      return setError(
        result.userErrors.map((item) => item.message).join(" ") || "Unable to update question",
      );
    await value.onSaved?.();
    setDirty(false);
    message.success(`${sectionTitle[section]} updated`);
    forcePop();
  };
  if (query.loading && !question)
    return (
      <ModalLayout
        name="question-edit"
        headerProps={{ title: sectionTitle[section], onClose: pop, submitButtonProps: null }}
      >
        <Skeleton active />
      </ModalLayout>
    );
  return (
    <ModalLayout
      name="question-edit"
      header={
        <ModalHeader
          name="question-edit"
          title={sectionTitle[section]}
          onClose={pop}
          submitButtonProps={{
            loading: mutation.loading,
            disabled: !dirty || !question,
            onClick: save,
          }}
        />
      }
    >
      {query.error || mutation.error ? (
        <Alert type="error" showIcon message={(query.error ?? mutation.error)?.message} />
      ) : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      {section === "content" ? (
        <>
          <Paper>
            <PaperHeader title="Associations & author" />
            <Flex vertical gap="middle">
              <div>
                <Typography.Text strong>Product *</Typography.Text>
                <Flex gap="small" style={{ marginTop: 8 }}>
                  <Input readOnly value={product?.title ?? ""} />
                  <Button icon={<ShoppingOutlined />} onClick={productPicker.openPicker}>
                    Select
                  </Button>
                </Flex>
              </div>
              <div>
                <Typography.Text strong>Customer</Typography.Text>
                <Flex gap="small" style={{ marginTop: 8 }}>
                  <Input readOnly value={customer?.title ?? "Guest or staff author"} />
                  <Button icon={<UserOutlined />} onClick={customerPicker.openPicker}>
                    Select
                  </Button>
                </Flex>
              </div>
              <Flex gap="middle">
                <Input
                  value={authorName}
                  placeholder="Author name"
                  onChange={(event) => {
                    setAuthorName(event.target.value);
                    change();
                  }}
                />
                <Input
                  type="email"
                  value={authorEmail}
                  placeholder="Author email"
                  onChange={(event) => {
                    setAuthorEmail(event.target.value);
                    change();
                  }}
                />
              </Flex>
            </Flex>
          </Paper>
          <Paper>
            <PaperHeader title="Question" />
            <Flex vertical gap="middle">
              <Select
                value={locale}
                options={shopLocales.map((item) => ({ value: item.value, label: item.name }))}
                onChange={(next) => {
                  setLocale(next);
                  change();
                }}
                showSearch
              />
              <Input.TextArea
                value={body}
                autoSize={{ minRows: 6, maxRows: 12 }}
                maxLength={5000}
                showCount
                onChange={(event) => {
                  setBody(event.target.value);
                  change();
                }}
              />
            </Flex>
          </Paper>
        </>
      ) : null}
      {section === "moderation" ? (
        <Paper>
          <PaperHeader title="Moderation decision" />
          <Flex vertical gap="middle">
            <Segmented
              block
              value={status}
              onChange={(next) => {
                setStatus(next);
                change();
              }}
              options={[
                {
                  value: ReviewContentStatus.Pending,
                  label: "Pending",
                  icon: <ClockCircleOutlined />,
                },
                {
                  value: ReviewContentStatus.Published,
                  label: "Published",
                  icon: <CheckCircleOutlined />,
                },
                {
                  value: ReviewContentStatus.Rejected,
                  label: "Rejected",
                  icon: <CloseCircleOutlined />,
                },
              ]}
            />
            <Input.TextArea
              value={moderationNote}
              placeholder="Internal moderation note"
              rows={5}
              maxLength={1000}
              showCount
              onChange={(event) => {
                setModerationNote(event.target.value);
                change();
              }}
            />
          </Flex>
        </Paper>
      ) : null}
      {section === "answers" ? (
        <Paper>
          <PaperHeader
            title={`Answers (${answers.length})`}
            actions={
              <Button
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAnswers((items) => [
                    ...items,
                    {
                      body: "",
                      locale: question?.locale ?? "en",
                      authorType: ReviewContentAuthorType.Staff,
                      authorName: "Staff",
                      authorEmail: "",
                      isOfficial: true,
                      isAccepted: false,
                    },
                  ]);
                  change();
                }}
              >
                Add answer
              </Button>
            }
          />
          <Flex vertical gap="middle">
            {answers.map((answer, index) => (
              <Paper key={answer.id ?? `new-${index}`}>
                <PaperHeader
                  title={answer.id ? `Answer ${index + 1}` : "New answer"}
                  actions={
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setAnswers((items) => items.filter((_, itemIndex) => itemIndex !== index));
                        change();
                      }}
                    />
                  }
                />
                <Flex vertical gap="small">
                  <Input.TextArea
                    value={answer.body}
                    rows={4}
                    maxLength={5000}
                    showCount
                    placeholder="Answer"
                    onChange={(event) => updateAnswer(index, "body", event.target.value)}
                  />
                  <Flex gap="small">
                    <Select
                      value={answer.locale}
                      options={shopLocales.map((item) => ({ value: item.value, label: item.name }))}
                      onChange={(next) => updateAnswer(index, "locale", next)}
                      style={{ width: 160 }}
                    />
                    <Input
                      value={answer.authorName}
                      placeholder="Author name"
                      onChange={(event) => updateAnswer(index, "authorName", event.target.value)}
                    />
                  </Flex>
                  <Flex gap="large">
                    <Checkbox
                      checked={answer.isOfficial}
                      onChange={(event) => updateAnswer(index, "isOfficial", event.target.checked)}
                    >
                      Official answer
                    </Checkbox>
                    <Checkbox
                      checked={answer.isAccepted}
                      onChange={(event) => updateAnswer(index, "isAccepted", event.target.checked)}
                    >
                      Accepted answer
                    </Checkbox>
                  </Flex>
                </Flex>
              </Paper>
            ))}
          </Flex>
        </Paper>
      ) : null}
    </ModalLayout>
  );
}
