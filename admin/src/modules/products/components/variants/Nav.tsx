import { ExpandButton } from '@components/table/ExpandableIcon';
import { TableImage } from '@components/table/image';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { MiddleArrow } from '@modules/products/components/variants/Arrows';
import { IProductFeature } from '@src/entity/Product/ProductFeature';
import { IProductVariant } from '@src/entity/Product/Variant';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Popconfirm, Typography } from 'antd';
import { uniqBy } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

interface IVariantsNavProps {
  variants: any[];
  openVariant?: (id: any, shouldSave: boolean) => void;
  activeId?: any;
  isDirty?: boolean;
}

export const VariantsNav = ({
  variants,
  openVariant,
  activeId,
  isDirty,
}: IVariantsNavProps) => {
  const intl = useIntl();
  const [expandedItems, setExpandedItems] = useState<ID | null>(null);

  const getOption = (it: Partial<IProductVariant>) =>
    it.options?.[0] as IProductFeature;

  const [compactVariants, isCompact] = useMemo(() => {
    if (!variants.length || variants[0].options?.length <= 1) {
      return [[], false];
    }

    const withIndex = variants.map((record, idx) => ({
      ...record,
      index: idx,
    }));

    const groups = uniqBy(variants.map(getOption), 'id')
      .filter(Boolean)
      .map((it) => ({
        ...it,
        isRoot: true,
        variants: withIndex
          .filter((variant) => variant.options?.[0]?.id === it.id)
          .map((it, idx, { length }) => ({
            ...it,
            isLastSubVariant: idx === length - 1,
          })),
      }));
    return [groups, true];
  }, [variants]);

  useEffect(() => {
    if (compactVariants.length) {
      setExpandedItems(
        compactVariants.find((it) =>
          it.variants.some((v: any) => v.id === activeId),
        )?.id ?? null,
      );
    }
  }, [compactVariants, activeId]);

  const renderItem = (record: any, idx: number) => {
    const handleOk = (shouldSave: boolean) => {
      return () => {
        openVariant?.(record.id, shouldSave);
      };
    };

    return (
      <Popconfirm
        key={idx}
        icon={null}
        okType="primary"
        title={intl.formatMessage({ id: 'common.saveChangesConfirm' })}
        onConfirm={handleOk(true)}
        onCancel={handleOk(false)}
        cancelText={intl.formatMessage({ id: 'common.no' })}
        okText={intl.formatMessage({ id: 'common.yes' })}
        disabled={!isDirty}
        destroyTooltipOnHide
        cancelButtonProps={{
          'data-testid': `nav-confirm-no`,
        }}
        okButtonProps={{
          'data-testid': `nav-confirm-yes`,
        }}
      >
        <Flex
          key={idx}
          gap="2"
          py="1"
          px="1"
          data-testid={`variant-nav-item-${idx}`}
          align="center"
          onClick={isDirty ? undefined : handleOk(false)}
          style={{
            cursor: 'pointer',
            marginBottom: 1,
            maxHeight: '40px',
            borderRadius: 'var(--radius-base)',
            ...(activeId === record.id
              ? {
                  backgroundColor: 'var(--color-gray-3)',
                  fontWeight: 500,
                }
              : {}),
          }}
        >
          {isCompact && <MiddleArrow isFinal={record.isLastSubVariant} />}
          <TableImage file={record.cover} size={30} />
          <Typography.Text
            ellipsis
            style={{
              cursor: 'pointer',
              color:
                activeId === record.id
                  ? 'var(--color-primary-10)'
                  : 'var(--color-primary-8)',
            }}
            css={css`
              &:hover {
                text-decoration: underline;
              }
            `}
          >
            {(record.options || [])
              .filter((_: any, idx: number, { length }: { length: number }) => {
                return length > 1 ? idx !== 0 : true;
              })
              .map((it: any) => it?.title)
              .join(' ▸ ')}
          </Typography.Text>
        </Flex>
      </Popconfirm>
    );
  };

  if (isCompact) {
    return (
      <DrawerPaper>
        <DrawerPaperHeader
          title={intl.formatMessage({ id: 'products.variants.title' })}
          name="variants"
        />
        <Box>
          {compactVariants.map((record, idx) => {
            return (
              <Flex gap="1" direction="column" key={idx}>
                <Button
                  type="text"
                  size="large"
                  css={css`
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--x1);
                    height: 44px;
                  `}
                  onClick={() => {
                    setExpandedItems((prev) =>
                      prev === record.id ? null : record.id,
                    );
                  }}
                >
                  <Flex align="center" gap="2">
                    <TableImage
                      file={record.variants[0]?.cover}
                      name="variant"
                      size={36}
                    />
                    <Typography.Text ellipsis>{record.title}</Typography.Text>
                  </Flex>
                  <ExpandButton
                    onClick={() => {}}
                    expanded={expandedItems === record.id}
                  />
                </Button>
                <Flex direction="column">
                  {expandedItems === record.id &&
                    record.variants.map(renderItem)}
                </Flex>
              </Flex>
            );
          })}
        </Box>
      </DrawerPaper>
    );
  }

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={intl.formatMessage({ id: 'products.variants.title' })}
        name="variants"
      />
      <Box>{(variants || []).map(renderItem)}</Box>
    </DrawerPaper>
  );
};
