import { CurrencyInput } from '@components/forms/CurrencyInput';
import { Flex } from '@components/utility/Flex';
import { CategorySelect } from '@modules/categories/components/CategorySelect';
import { FeatureSelect } from '@modules/features/components/FeatureSelect';
import { StockStatusSelect } from '@modules/stockStatuses/components/StockStatusSelect';
import { TagSelect } from '@modules/tags/components/TagSelect';
import { FilterOperators } from '@src/entity/Filter/enums';
import { FilterType } from '@src/graphql';
import { Input } from 'antd';
import { RiCodeFill } from 'react-icons/ri';

interface IRelationControlProps {
  onChange: (value: any[]) => void;
  operator: FilterOperators;
  status: 'error' | undefined;
  type: FilterType;
  value: any[];
}

export const RelationControl = ({
  onChange,
  operator,
  status,
  type,
  value,
}: IRelationControlProps) => {
  const isMultiple = [FilterOperators.In, FilterOperators.NotIn].includes(
    operator,
  );

  if (type === FilterType.Category) {
    return (
      <CategorySelect
        multiple={isMultiple}
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
        value={value}
        showValue
      />
    );
  }

  if (type === FilterType.Tag) {
    return (
      <TagSelect
        multiple={isMultiple}
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
        value={value}
        showValue
      />
    );
  }

  if (type === FilterType.Feature) {
    return (
      <FeatureSelect
        showValue
        status={status}
        multiple={isMultiple}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
        value={value}
      />
    );
  }

  if (type === FilterType.Availability) {
    return (
      <StockStatusSelect
        status={status}
        multiple={isMultiple}
        defaultStatus={null}
        onChange={(next) => {
          onChange(next as string[]);
          return;
        }}
        value={value}
      />
    );
  }

  if (type === FilterType.Price) {
    const safeValue = value || [0, 0];

    return (
      <Flex gap="3" w="100%" align="center">
        <CurrencyInput
          value={safeValue[0]}
          data-testid="price-from-input"
          onChange={(next) => {
            onChange([next, safeValue[1]]);
          }}
        />
        <Flex>
          <RiCodeFill />
        </Flex>
        <CurrencyInput
          data-testid="price-to-input"
          value={safeValue[1]}
          onChange={(next) => {
            onChange([safeValue[0], next]);
          }}
        />
      </Flex>
    );
  }

  return <Input disabled />;
};
