import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { ILocale } from '@src/entity/Locale/Locale';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Divider, Tag, Typography } from 'antd';
import { MdArrowForward } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface ITranslationsNavProps {
  locales: ILocale[];
  onChange?: (locale: string) => void;
  activeLocale?: string;
  manageButton?: boolean;
}

export const TranslationsNav = ({
  locales,
  onChange,
  activeLocale,
  manageButton,
}: ITranslationsNavProps) => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={formatMessage({ id: t('translations.languages') })}
        name="lang"
        badgeCount={locales.length}
      />
      <Box>
        {locales.map((it, idx) => {
          return (
            <Flex
              key={idx}
              gap="4"
              py="1"
              px="4"
              h="40px"
              data-testid={`locales-item-${idx}`}
              align="center"
              {...(onChange ? { onClick: () => onChange(it.code) } : {})}
              css={css`
                cursor: pointer;
                border-radius: var(--radius-base);
                margin-bottom: 1px;
                &:hover span {
                  text-decoration: underline;
                }
              `}
              style={{
                ...(activeLocale === it.code
                  ? { backgroundColor: 'var(--color-gray-3)' }
                  : {}),
              }}
            >
              <Typography.Text
                ellipsis
                style={{
                  ...(activeLocale === it.code
                    ? { color: 'var(--color-primary)' }
                    : {}),
                }}
              >
                {it.title}
              </Typography.Text>
              {idx === 0 && (
                <Tag color="default">
                  {formatMessage({ id: t('translations.default') })}
                </Tag>
              )}
            </Flex>
          );
        })}
      </Box>
      {manageButton && (
        <>
          <Divider
            style={{
              margin: 'var(--x4) 0',
            }}
          />
          <Button
            size="small"
            type="link"
            onClick={() => {
              router.navigate(routes.settings.link);
            }}
          >
            {formatMessage({ id: t('translations.manageLanguages') })}{' '}
            <MdArrowForward />
          </Button>
        </>
      )}
    </DrawerPaper>
  );
};
