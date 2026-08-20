"use client";

import { Alert, Tag } from "antd";
import {
  LuFileSearch as CasesOutlined,
  LuFlag as ReportsOutlined,
  LuMessageSquare as QuestionsOutlined,
  LuRefreshCw as SyncOutlined,
  LuSend as RequestsOutlined,
  LuSettings as SettingsOutlined,
  LuShieldCheck as ModerationOutlined,
  LuStar as ReviewsOutlined,
} from "react-icons/lu";
import { useRouter } from "next/navigation";
import { createStyles } from "antd-style";
import { DataLayout } from "@/layouts/data";
import { SectionNavigator } from "@/layouts/section-navigation";
import { usePathParams } from "@/registry";
import { useUgcSectionCounts } from "./use-ugc-section-counts";

const useStyles = createStyles(({ token }) => ({
  content: {
    height: "100%",
    overflow: "auto",
    paddingBottom: token.paddingXL,
  },
}));

export default function UgcPage() {
  const { styles } = useStyles();
  const router = useRouter();
  const { resolvePath } = usePathParams();
  const open = (path: string) => () => router.push(resolvePath(path));
  const { counts, error } = useUgcSectionCounts();
  const count = (value: number, label: string) => (
    <Tag bordered={false} color={value > 0 ? "blue" : undefined}>
      {value} {label}
    </Tag>
  );

  return (
    <DataLayout name="ugc">
      <DataLayout.Header>
        <DataLayout.Title>UGC</DataLayout.Title>
      </DataLayout.Header>
      <DataLayout.Content className={styles.content}>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Could not load UGC section counts."
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <SectionNavigator
          testId="ugc-sections-card"
          items={[
            {
              key: "reviews",
              title: "Reviews",
              description: "Manage product reviews, ratings, media and merchant replies.",
              icon: <ReviewsOutlined />,
              trailing: count(counts.reviews, "reviews"),
              onClick: open("/:orgName/:storeName/customer-content/reviews"),
            },
            {
              key: "questions",
              title: "Q&A",
              description: "Review product questions, answers and unanswered customer requests.",
              icon: <QuestionsOutlined />,
              trailing: count(counts.questions, "questions"),
              onClick: open("/:orgName/:storeName/customer-content/questions"),
            },
            {
              key: "moderation",
              title: "Moderation",
              description: "Inspect customer content and apply moderation decisions.",
              icon: <ModerationOutlined />,
              trailing: count(counts.moderation, "items"),
              onClick: open("/:orgName/:storeName/customer-content/moderation"),
            },
            {
              key: "reports",
              title: "Reports",
              description: "Handle content reports submitted by customers and staff.",
              icon: <ReportsOutlined />,
              trailing: count(counts.reports, "reports"),
              onClick: open("/:orgName/:storeName/customer-content/reports"),
            },
            {
              key: "cases",
              title: "Moderation cases",
              description: "Track escalated moderation investigations and resolutions.",
              icon: <CasesOutlined />,
              trailing: count(counts.moderationCases, "cases"),
              onClick: open("/:orgName/:storeName/customer-content/cases"),
            },
            {
              key: "review-requests",
              title: "Review requests",
              description: "Schedule and monitor post-purchase review invitations.",
              icon: <RequestsOutlined />,
              trailing: count(counts.reviewRequests, "requests"),
              onClick: open("/:orgName/:storeName/customer-content/review-requests"),
            },
            {
              key: "external-sync",
              title: "External sync",
              description: "Manage review references synchronized with external platforms.",
              icon: <SyncOutlined />,
              trailing: count(counts.externalReferences, "references"),
              onClick: open("/:orgName/:storeName/customer-content/external-sync"),
            },
            {
              key: "settings",
              title: "Settings",
              description: "Configure reviews, Q&A, moderation, limits and rating criteria.",
              icon: <SettingsOutlined />,
              trailing: <Tag bordered={false}>Configuration</Tag>,
              onClick: open("/:orgName/:storeName/customer-content/settings"),
            },
          ]}
        />
      </DataLayout.Content>
    </DataLayout>
  );
}
