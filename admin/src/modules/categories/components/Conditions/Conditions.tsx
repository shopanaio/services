import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { RelationControl } from '@modules/categories/components/Conditions/RelationControl';
import {
  emptyFilter,
  listingFilters,
} from '@modules/categories/components/Conditions/options';
import { FilterOperators, FilterValueType } from '@src/entity/Filter/enums';
import { IFilter } from '@src/entity/Filter/types';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Input, Select, Typography } from 'antd';
import { useLayoutEffect } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import { MdClose } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const getInitialValue = (type: FilterValueType, operator: FilterOperators) => {
  if (FilterValueType.Relation === type) {
    return [];
  }

  if ([FilterOperators.In, FilterOperators.NotIn].includes(operator)) {
    return [];
  }

  return null;
};

export const ListingConditions = () => {
  const { append, fields, update, remove, replace } = useFieldArray({
    name: 'conditions',
  });
  const { formatMessage } = useIntl();

  useLayoutEffect(() => {
    if (!fields.length) {
      append(emptyFilter);
    }

    return () => {
      replace([]);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={formatMessage({ id: t('category.conditions.title') })}
        name="listing-filters"
      />
      <Flex gap="2" direction="column">
        {fields.map(({ id }, idx) => {
          return (
            <Controller
              key={id}
              name={`conditions.${idx}`}
              render={({ field }) => {
                const value: IFilter = field.value;
                const condition = listingFilters[value.type];

                return (
                  <div
                    key={id}
                    css={css`
                      width: 100%;
                      display: grid;
                      grid-template-columns: 1fr 1fr 2fr;
                      gap: var(--x2);
                    `}
                  >
                    <Select
                      value={value?.type}
                      data-filter-type={value?.type?.toLowerCase() || ''}
                      data-testid={`filter-select-${idx}`}
                      onSelect={(v: string) => {
                        const c = listingFilters[v];
                        if (!c || condition?.type === v) {
                          return;
                        }

                        update(idx, {
                          type: c.type,
                          operator: c.operators[0],
                          value: getInitialValue(
                            c.valueType,
                            c.operators[0].value,
                          ),
                          valueType: c.valueType,
                        });
                      }}
                      placeholder={formatMessage({
                        id: t('category.conditions.selectFilter'),
                      })}
                      options={Object.values(listingFilters).map((it) => ({
                        label: it.label,
                        value: it.type,
                      }))}
                    />
                    <Select
                      value={value?.operator?.value}
                      data-operator={
                        value?.operator?.value?.toLowerCase() || ''
                      }
                      data-testid={`operator-select-${idx}`}
                      onSelect={(operator) => {
                        update(idx, {
                          ...value,
                          operator: condition.operators.find(
                            (it) => it.value === operator,
                          ),
                          value: getInitialValue(value.valueType, operator),
                        });
                      }}
                      disabled={!condition}
                      options={condition?.operators || []}
                    />
                    <Controller
                      name={`conditions.${idx}.value`}
                      render={({ field, fieldState }) => (
                        <Flex gap="2">
                          {value.operator ? (
                            <RelationControl
                              value={field.value}
                              onChange={field.onChange}
                              operator={value.operator.value}
                              type={value.type}
                              status={fieldState.invalid ? 'error' : undefined}
                            />
                          ) : (
                            <Input disabled />
                          )}

                          <Button
                            onClick={() => remove(idx)}
                            icon={<MdClose />}
                            disabled={fields?.length <= 1}
                          />
                        </Flex>
                      )}
                    />
                  </div>
                );
              }}
            />
          );
        })}
        {fields?.length < 5 && (
          <Box
            css={css`
              width: 100%;
              display: grid;
              grid-template-columns: 1fr 1fr 2fr;
              gap: var(--x2);
            `}
          >
            <Button block onClick={() => append(emptyFilter)}>
              {formatMessage({ id: t('category.conditions.addFilter') })}
            </Button>
          </Box>
        )}
      </Flex>
      <Flex direction="column" mt="6">
        <Typography.Text type="secondary">
          {formatMessage({ id: t('category.conditions.andLogic') })}{' '}
          <Typography.Text strong type="secondary">
            {formatMessage({ id: t('category.conditions.andText') })}
          </Typography.Text>{' '}
          {formatMessage({ id: t('category.conditions.orLogic') })}{' '}
          <Typography.Text strong type="secondary">
            {formatMessage({ id: t('category.conditions.orText') })}
          </Typography.Text>
          .
        </Typography.Text>
        <Typography.Text type="secondary">
          {formatMessage({ id: t('category.conditions.description') })}
        </Typography.Text>
      </Flex>
    </DrawerPaper>
  );
};
