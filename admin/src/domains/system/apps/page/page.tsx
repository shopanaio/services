"use client";

import { Alert, Col, Empty, Row, Skeleton } from "antd";
import { useCallback, useMemo } from "react";
import { DataLayout } from "@/layouts/data";
import { AppCard } from "../components";
import { useApps } from "../hooks";

export default function SystemAppsPage() {
  const { apps, error, installedApps, loading, refetch } = useApps();
  const installedCodes = useMemo(
    () => new Set(installedApps.map((app) => app.appCode)),
    [installedApps],
  );
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DataLayout name="system-apps" title="Apps">
      <DataLayout.Content>
        {error ? <Alert message={error.message} showIcon type="error" /> : null}
        {loading ? (
          <Row gutter={[12, 12]}>
            {Array.from({ length: 6 }).map((value, index) => {
              void value;
              return (
                <Col key={index} lg={8} md={8} sm={12} xs={24}>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </Col>
              );
            })}
          </Row>
        ) : apps.length ? (
          <Row gutter={[12, 12]}>
            {apps.map((app) => (
              <Col key={app.code} lg={8} md={8} sm={12} xs={24}>
                <AppCard
                  app={app}
                  installed={installedCodes.has(app.code)}
                  onSaved={refresh}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No apps available" />
        )}
      </DataLayout.Content>
    </DataLayout>
  );
}
