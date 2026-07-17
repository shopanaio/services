"use client";

import { Alert, Descriptions, Flex, Progress, Skeleton, Statistic, Typography } from "antd";
import { LuChartBar as BarChartOutlined, LuCircleHelp as QuestionOutlined, LuStar as StarFilled } from "react-icons/lu";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useProductReviewsWidget } from "@/domains/customer-content/reviews/hooks";
import type { ProductInsightsModalPayload } from "../modals";

export function ProductInsightsModal() {
  const { payload, pop } = useModalStackContext();
  const value = payload as ProductInsightsModalPayload;
  const widget = useProductReviewsWidget(value.product.id);
  const summary = widget.data?.reviewSummary;
  const questions = widget.data?.questionSummary;
  const reviewCount = summary?.reviewCount ?? 0;
  const averageRating = summary?.averageRating ?? 0;
  const verifiedReviewCount = summary?.verifiedReviewCount ?? 0;
  const mediaReviewCount = summary?.mediaReviewCount ?? 0;
  const ratingBreakdown: Record<number, number> = summary ? {
    5: summary.ratingBreakdown.rating5Count,
    4: summary.ratingBreakdown.rating4Count,
    3: summary.ratingBreakdown.rating3Count,
    2: summary.ratingBreakdown.rating2Count,
    1: summary.ratingBreakdown.rating1Count,
  } : { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const criteria = summary?.criteria.length ? summary.criteria.map((item) => ({
    id: item.criterion.id,
    title: item.criterion.defaultTitle,
    averageRating: item.averageRating,
    reviewCount: item.reviewCount,
  })) : [];

  return <ModalLayout name="product-insights" header={<ModalHeader name="product-insights" title="Product insights" onClose={pop} submitButtonProps={null} />}>
    <Paper>
      <PaperHeader title={value.product.title} icon={<BarChartOutlined />} />
      <Descriptions column={{ xs: 1, sm: 2 }} items={[
        { key: "handle", label: "Handle", children: value.product.handle },
        { key: "id", label: "Product ID", children: value.product.id },
      ]} />
    </Paper>
    {widget.error ? <Alert type="error" showIcon message={widget.error.message} /> : null}
    <Paper>
      <PaperHeader title="Reviews" icon={<StarFilled />} />
      <Flex gap="large" wrap="wrap">
        <Statistic title="Reviews" value={reviewCount} />
        <Statistic title="Average rating" value={averageRating} precision={2} suffix="/ 5" />
        <Statistic title="Verified purchases" value={verifiedReviewCount} />
        <Statistic title="With photos or video" value={mediaReviewCount} />
      </Flex>
      <Flex vertical gap="small" style={{ marginTop: 20 }}>
        {[5, 4, 3, 2, 1].map((rating) => <Flex key={rating} gap="middle" align="center">
          <Typography.Text style={{ width: 52 }}>{rating} stars</Typography.Text>
          <Progress percent={reviewCount ? Math.round((ratingBreakdown[rating] / reviewCount) * 100) : 0} format={() => String(ratingBreakdown[rating])} />
        </Flex>)}
      </Flex>
    </Paper>
    <Paper>
      <PaperHeader title="Rating criteria" />
      <Descriptions column={1} items={criteria.map((criterion) => ({
        key: criterion.id,
        label: criterion.title,
        children: `${criterion.averageRating.toFixed(2)} / 5 from ${criterion.reviewCount} reviews`,
      }))} />
    </Paper>
    <Paper>
      <PaperHeader title="Questions & answers" icon={<QuestionOutlined />} />
      {widget.loading && !widget.data ? <Skeleton active paragraph={{ rows: 2 }} /> : <Flex gap="large" wrap="wrap">
        <Statistic title="Questions" value={questions?.questionCount ?? 0} />
        <Statistic title="Answered" value={questions?.answeredQuestionCount ?? 0} />
        <Statistic title="Unanswered" value={questions?.unansweredQuestionCount ?? 0} />
        <Statistic title="Answers" value={questions?.answerCount ?? 0} />
        <Statistic title="Official answers" value={questions?.officialAnswerCount ?? 0} />
      </Flex>}
    </Paper>
  </ModalLayout>;
}
