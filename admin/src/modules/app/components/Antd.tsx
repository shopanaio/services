import { setNotificationApi } from '@components/feedback/notification';
import { GlobalStyles } from '@components/theme/GlobalStyles';
import { ConfigProvider, App, notification } from 'antd';
import { ReactNode, useEffect } from 'react';
import { useIntl } from 'react-intl';

import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';

import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';

dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);

export const Antd = ({ children }: { children: ReactNode }) => {
  const intl = useIntl();
  const [api, contextHolder] = notification.useNotification({
    maxCount: 5,
    stack: true,
    pauseOnHover: true,
    placement: 'bottom',
    bottom: 16,
    closeIcon: null,
    duration: 3,
  });

  useEffect(() => {
    setNotificationApi(api);
  }, [api]);

  useEffect(() => {
    dayjs.locale(intl.locale === 'ru' ? 'ru' : 'en');
  }, [intl.locale]);

  const antdLocale = intl.locale === 'ru' ? ruRU : enUS;

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        // cssVar: true,
        // algorithm: theme.darkAlgorithm,
        token: {
          // colorPrimary: '#2f54eb',
          colorLink: '#2f54eb',
          colorPrimary: '#000',
          // colorLink: '#000',
          fontFamily: 'var(--font-family-base)',
        },

        components: {
          Button: {
            primaryShadow: 'none',
            defaultShadow: 'var(--ds-shadow-border), var(--ds-shadow-small)',
          },
          Table: {
            padding: 8,
            headerBg: 'var(--color-gray-1)',
            rowHoverBg: 'var(--color-gray-2)',
            rowSelectedBg: 'var(--color-primary-3)',
            rowSelectedHoverBg: 'var(--color-primary-3)',
          },
          Input: {
            activeShadow: 'var(--box-shadow-control)',
          },
          Layout: {
            bodyBg: 'transparent',
          },
          Menu: {
            itemColor: 'var(--color-primary-8)',
            itemActiveBg: 'var(--color-primary-4)',
            itemHoverBg: 'var(--color-primary-3)',
            itemSelectedBg: 'var(--color-primary-4)',
            itemSelectedColor: 'var(--color-primary-10)',
            // @ts-expect-error type
            itemBorderRadius: 'var(--radius-base)',
          },
          Modal: {
            boxShadow: 'var(--box-shadow-modal)',
            colorBgMask: 'rgba(241, 241, 241, 0.8)',
          },
          Popover: {
            boxShadowSecondary: 'var(--box-shadow-modal)',
          },
          Badge: {
            fontSize: 12,
            colorBgBase: 'var(--color-primary-10)',
          },
          Select: {
            activeOutlineColor: 'var(--color-primary-5)',
            optionSelectedFontWeight: 'var(--font-weight-400)',
            optionActiveBg: 'var(--color-primary-3)',
            optionSelectedBg: 'var(--color-primary-3)',
            optionSelectedColor: 'var(--color-primary-10)',
            boxShadowSecondary: 'var(--box-shadow-menu)',
          },
          DatePicker: {
            cellActiveWithRangeBg: 'var(--color-primary-4)',
            colorPrimary: 'var(--color-primary-10)',
            colorPrimaryBg: 'var(--color-primary-3)',
          },
          Dropdown: {
            controlItemBgActive: 'var(--color-primary-3)',
            controlItemBgActiveHover: 'var(--color-primary-4)',
          },
          // Notification: {
          //   progressBg: 'red',
          // },
        },
      }}
    >
      <GlobalStyles />
      <App>
        {contextHolder}
        {children}
      </App>
    </ConfigProvider>
  );
};
