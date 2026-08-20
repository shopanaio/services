"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Flex,
  InputNumber,
  Select,
  Skeleton,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  LuPlus as PlusOutlined,
  LuSave as SaveOutlined,
  LuSettings as SettingOutlined,
} from "react-icons/lu";
import {
  ReviewDuplicatePolicy,
  ReviewModerationMode,
  type ApiReviewStoreConfigurationUpdateInput,
} from "@/graphql/types";
import { DataLayout } from "@/layouts/data";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useRatingCriterionModal } from "../modals";
import { useManagementMutations, useRatingCriteria, useReviewConfiguration } from "../hooks";
import type { RatingCriterion, ReviewConfiguration } from "../types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";

const moderationOptions = Object.values(ReviewModerationMode).map((value) => ({
  value,
  label: value.toLowerCase().replaceAll("_", " "),
}));
const duplicateOptions = Object.values(ReviewDuplicatePolicy).map((value) => ({
  value,
  label: value.toLowerCase().replaceAll("_", " "),
}));
const editableValues = (item: ReviewConfiguration): ApiReviewStoreConfigurationUpdateInput => ({
  reviewsEnabled: item.reviewsEnabled,
  questionsEnabled: item.questionsEnabled,
  guestReviewsEnabled: item.guestReviewsEnabled,
  guestQuestionsEnabled: item.guestQuestionsEnabled,
  customerAnswersEnabled: item.customerAnswersEnabled,
  verifiedPurchaseRequired: item.verifiedPurchaseRequired,
  reviewModerationMode: item.reviewModerationMode,
  questionModerationMode: item.questionModerationMode,
  answerModerationMode: item.answerModerationMode,
  reviewDuplicatePolicy: item.reviewDuplicatePolicy,
  reviewRequestsEnabled: item.reviewRequestsEnabled,
  reviewRequestDelayDays: item.reviewRequestDelayDays,
  reviewRequestExpiryDays: item.reviewRequestExpiryDays,
  reviewEditWindowHours: item.reviewEditWindowHours,
  questionEditWindowHours: item.questionEditWindowHours,
  answerEditWindowHours: item.answerEditWindowHours,
  maxReviewMediaCount: item.maxReviewMediaCount,
  maxAnswersPerQuestion: item.maxAnswersPerQuestion,
});

export default function ReviewSettingsPage() {
  const { backToUgc } = useUgcNavigation();
  const { message } = App.useApp();
  const { push: pushCriterion } = useRatingCriterionModal();
  const query = useReviewConfiguration();
  const criteriaQuery = useRatingCriteria();
  const mutations = useManagementMutations();
  const configuration = query.data?.reviewsQuery.storeConfiguration;
  const criteriaConnection = criteriaQuery.data?.reviewsQuery.ratingCriteria;
  const [values, setValues] = useState<ApiReviewStoreConfigurationUpdateInput>({});
  const [dirty, setDirty] = useState(false);
  const [loadedRevision, setLoadedRevision] = useState<number | null>(null);
  if (configuration && loadedRevision !== configuration.revision) {
    setLoadedRevision(configuration.revision);
    setValues(editableValues(configuration));
    setDirty(false);
  }
  const set = <K extends keyof ApiReviewStoreConfigurationUpdateInput>(
    key: K,
    value: ApiReviewStoreConfigurationUpdateInput[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const save = async () => {
    if (!configuration) return;
    const result = await mutations.updateConfiguration(
      configuration.id,
      configuration.revision,
      values,
    );
    if (result.errors.length)
      return message.error(result.errors.map((item) => item.message).join(" "));
    await query.refetch();
    message.success("Review settings saved");
  };
  const toggle = (
    key: keyof ApiReviewStoreConfigurationUpdateInput,
    label: string,
    description: string,
  ) => (
    <Flex justify="space-between" align="center" gap="large">
      <div>
        <Typography.Text strong>{label}</Typography.Text>
        <br />
        <Typography.Text type="secondary">{description}</Typography.Text>
      </div>
      <Switch checked={Boolean(values[key])} onChange={(checked) => set(key, checked)} />
    </Flex>
  );
  const number = (key: keyof ApiReviewStoreConfigurationUpdateInput, label: string, min = 0) => (
    <Flex justify="space-between" align="center" gap="large">
      <Typography.Text>{label}</Typography.Text>
      <InputNumber
        min={min}
        value={values[key] as number | undefined}
        onChange={(value) => set(key, value ?? min)}
      />
    </Flex>
  );
  const criterionColumns: ColumnsType<RatingCriterion> = [
    {
      title: "Criterion",
      key: "title",
      render: (_, item) => (
        <Flex vertical>
          <Typography.Text strong>{item.defaultTitle}</Typography.Text>
          <Typography.Text type="secondary">{item.code}</Typography.Text>
        </Flex>
      ),
    },
    { title: "Weight", dataIndex: "weight", width: 100 },
    {
      title: "Scope",
      key: "scope",
      render: (_, item) =>
        item.appliesToAllProducts ? "All products" : `${item.assignments.length} assignments`,
    },
    {
      title: "Required",
      dataIndex: "isRequired",
      width: 110,
      render: (value) => (value ? <Tag color="blue">Required</Tag> : "Optional"),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 100,
      render: (value) => (
        <Tag color={value ? "green" : undefined}>{value ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      width: 190,
      render: (value) => new Date(value).toLocaleString(),
    },
  ];
  return (
    <DataLayout
      name="review-settings"
      title="Reviews & Q&A settings"
      onBack={backToUgc}
      actions={
        <Button
          type="primary"
          icon={<SaveOutlined />}
          disabled={!dirty || !configuration}
          loading={mutations.loading}
          onClick={save}
        >
          Save
        </Button>
      }
    >
      {query.error || criteriaQuery.error ? (
        <Alert type="error" showIcon message={(query.error ?? criteriaQuery.error)?.message} />
      ) : null}
      {query.loading && !configuration ? <Skeleton active /> : null}
      {configuration ? (
        <Flex vertical gap={12} style={{ paddingBottom: 24 }}>
          <Paper>
            <PaperHeader title="Storefront features" icon={<SettingOutlined />} />
            <Flex vertical gap="large">
              {toggle(
                "reviewsEnabled",
                "Product reviews",
                "Allow reviews to be displayed and submitted.",
              )}
              {toggle("questionsEnabled", "Product Q&A", "Allow product questions and answers.")}
              {toggle(
                "guestReviewsEnabled",
                "Guest reviews",
                "Accept reviews from authors without customer accounts.",
              )}
              {toggle(
                "guestQuestionsEnabled",
                "Guest questions",
                "Accept questions from authors without customer accounts.",
              )}
              {toggle(
                "customerAnswersEnabled",
                "Customer answers",
                "Allow customers to answer product questions.",
              )}
              {toggle(
                "verifiedPurchaseRequired",
                "Verified purchase required",
                "Only customers with order evidence can review.",
              )}
              {toggle(
                "reviewRequestsEnabled",
                "Review requests",
                "Enable scheduled post-purchase review requests.",
              )}
            </Flex>
          </Paper>
          <Paper>
            <PaperHeader title="Moderation" />
            <Flex vertical gap="middle">
              <Flex justify="space-between" align="center">
                <Typography.Text>Reviews</Typography.Text>
                <Select
                  value={values.reviewModerationMode}
                  options={moderationOptions}
                  onChange={(value) => set("reviewModerationMode", value)}
                  style={{ width: 240 }}
                />
              </Flex>
              <Flex justify="space-between" align="center">
                <Typography.Text>Questions</Typography.Text>
                <Select
                  value={values.questionModerationMode}
                  options={moderationOptions}
                  onChange={(value) => set("questionModerationMode", value)}
                  style={{ width: 240 }}
                />
              </Flex>
              <Flex justify="space-between" align="center">
                <Typography.Text>Answers</Typography.Text>
                <Select
                  value={values.answerModerationMode}
                  options={moderationOptions}
                  onChange={(value) => set("answerModerationMode", value)}
                  style={{ width: 240 }}
                />
              </Flex>
              <Flex justify="space-between" align="center">
                <Typography.Text>Duplicate review policy</Typography.Text>
                <Select
                  value={values.reviewDuplicatePolicy}
                  options={duplicateOptions}
                  onChange={(value) => set("reviewDuplicatePolicy", value)}
                  style={{ width: 240 }}
                />
              </Flex>
            </Flex>
          </Paper>
          <Paper>
            <PaperHeader title="Limits & timing" />
            <Flex vertical gap="middle">
              {number("reviewRequestDelayDays", "Request delay (days)")}
              {number("reviewRequestExpiryDays", "Request expiry (days)", 1)}
              {number("reviewEditWindowHours", "Review edit window (hours)")}
              {number("questionEditWindowHours", "Question edit window (hours)")}
              {number("answerEditWindowHours", "Answer edit window (hours)")}
              {number("maxReviewMediaCount", "Maximum review media")}
              {number("maxAnswersPerQuestion", "Maximum answers per question", 1)}
            </Flex>
          </Paper>
          <Paper>
            <PaperHeader
              title="Rating criteria"
              actions={
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => pushCriterion({ onSaved: criteriaQuery.refetch })}
                >
                  Create criterion
                </Button>
              }
            />
            <Typography.Paragraph type="secondary">
              Configure additional rating dimensions that customers can score alongside the overall
              product rating.
            </Typography.Paragraph>
            <Table
              rowKey="id"
              loading={criteriaQuery.loading}
              dataSource={criteriaConnection?.edges.map((edge) => edge.node) ?? []}
              columns={criterionColumns}
              pagination={false}
              onRow={(criterion) => ({
                onClick: () => pushCriterion({ criterion, onSaved: criteriaQuery.refetch }),
                style: { cursor: "pointer" },
              })}
            />
          </Paper>
          <Typography.Text type="secondary">
            Revision {configuration.revision} · updated{" "}
            {new Date(configuration.updatedAt).toLocaleString()}
          </Typography.Text>
        </Flex>
      ) : null}
    </DataLayout>
  );
}
