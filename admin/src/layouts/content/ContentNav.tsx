import { ConfirmSaving } from '@components/forms/ConfirmSaving';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IMenu } from '@src/entity/Menu/Menu';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Skeleton, Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IContentNavProps {
  onOpen?: (id: any, shouldSave: boolean) => void;
  activeId?: any;
  isDirty?: boolean;
  menus: IMenu[];
  onCreate?: (shouldSave: boolean) => void;
  loading?: boolean;
}

export const ContentNav = ({
  onOpen,
  onCreate,
  activeId,
  isDirty,
  menus,
  loading,
}: IContentNavProps) => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={formatMessage({ id: t('layouts.content.title') })}
        name="content"
      />
      <Box>
        {loading && <Skeleton title={false} paragraph={{ rows: 3 }} active />}
        {menus.map((it, idx) => {
          const handleOk = (shouldSave: boolean) => {
            onOpen?.(it.id, shouldSave);
          };

          return (
            <ConfirmSaving key={idx} onOk={handleOk} disabled={!isDirty}>
              <Flex
                key={idx}
                px="4"
                h="40px"
                data-testid={`menus-nav-item-${idx}`}
                align="center"
                onClick={() => !isDirty && handleOk(false)}
                css={css`
                  cursor: pointer;
                  margin-bottom: 1px;
                  border-radius: var(--radius-base);
                  &:hover span {
                    text-decoration: underline;
                  }
                `}
                style={{
                  ...(activeId === it.id
                    ? { backgroundColor: 'var(--color-gray-3)' }
                    : {}),
                }}
              >
                <Typography.Text
                  ellipsis
                  style={{
                    ...(activeId === it.id
                      ? { color: 'var(--color-primary)' }
                      : {}),
                  }}
                >
                  {it.title}
                </Typography.Text>
              </Flex>
            </ConfirmSaving>
          );
        })}
      </Box>
      <Box mt="4">
        {onCreate ? (
          <ConfirmSaving onOk={onCreate} disabled={!isDirty}>
            <Button onClick={() => !isDirty && onCreate(false)}>
              {formatMessage({ id: t('layouts.content.createMenu') })}
            </Button>
          </ConfirmSaving>
        ) : (
          <Button disabled>
            {formatMessage({ id: t('layouts.content.createMenu') })}
          </Button>
        )}
      </Box>
      <Box mt="4">
        <Typography.Text type="secondary">
          {formatMessage({ id: t('layouts.content.menuDescription') })}
        </Typography.Text>
      </Box>
    </DrawerPaper>
  );
};
