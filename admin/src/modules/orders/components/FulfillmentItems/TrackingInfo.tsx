import { getCopyableProps } from '@components/utility/Copyable';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IShippingItem } from '@src/entity/Order/ShippingItem';
import { Divider, Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const TrackingInfo = ({
  trackingInfo,
}: {
  trackingInfo: IShippingItem;
}) => {
  const { trackingCode, shippingMethod } = trackingInfo;
  const intl = useIntl();

  return (
    <>
      <Divider
        css={css`
          margin: 0 0 var(--x4);
        `}
      />
      <Flex gap="6" mt="4" align="center">
        <Flex gap="2" align="center">
          <Typography.Text type="secondary">
            {intl.formatMessage({ id: t('orders.shippingDetails.method.label') })}
          </Typography.Text>
          <Typography.Text>
            {shippingMethod?.name || intl.formatMessage({ id: t('table.notSet') })}
          </Typography.Text>
        </Flex>
        <Flex gap="2" align="center">
          <Typography.Text type="secondary">
            {intl.formatMessage({ id: t('orders.shipping.trackingCode') })}
          </Typography.Text>
          <Typography.Text
            strong={!!trackingCode}
            copyable={trackingCode ? getCopyableProps(trackingCode) : undefined}
          >
            {trackingCode ||
              intl.formatMessage({ id: t('orders.shipping.noTrackingCode') })}
          </Typography.Text>
        </Flex>
      </Flex>
    </>
  );
};
