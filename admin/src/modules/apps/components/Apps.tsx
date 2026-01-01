import { EmptyState } from '@components/emptyState/EmptyState';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { AppCard } from '@modules/apps/components/AppCard';
import { useApps } from '@modules/apps/hooks/useApps';
import { Col, Row, Skeleton } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { SettingsNav } from '@modules/settings/components/Nav';
import { SETTINGS_TABS } from '@modules/settings/defs';

export const Apps = () => {
  const { apps, loading } = useApps();
  const { formatMessage } = useIntl();

  const leftColumn = (
    <>
      {loading ? (
        <Row gutter={[12, 12]}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <Col xs={24} sm={12} md={8} lg={8} key={idx}>
              <Skeleton active title paragraph={{ rows: 3 }} />
            </Col>
          ))}
        </Row>
      ) : !apps.length ? (
        <Box px="4" py="4">
          <EmptyState
            imageSrc="/images/empty-state-box.png"
            title={formatMessage({ id: t('apps.empty.title') })}
            subtitle={formatMessage({ id: t('apps.empty.subtitle') })}
          />
        </Box>
      ) : (
        <Box >
          <Row
            gutter={[12, 12]}
            css={css`
              width: 100%;
            `}
          >
            {apps.map((it) => (
              <Col xs={24} sm={12} md={8} lg={8} key={it.code}>
                <AppCard app={it} />
              </Col>
            ))}
          </Row>
        </Box>
      )}
    </>
  );

  return (
    <PageLayout
      name="settings-apps"
      errors={{}}
      headerProps={{
        title: formatMessage({ id: t('apps.title') }),
        status: false,
        submitButtonProps: null,
        switchLocale: false,
      }}
      leftColumn={leftColumn}
      rightColumn={<SettingsNav tab={SETTINGS_TABS.APPS} isDirty={false} />}
    />
  );
};
