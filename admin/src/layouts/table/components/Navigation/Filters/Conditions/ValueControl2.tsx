import { CurrencyInput } from '@components/forms/CurrencyInput';
import { WeightInput } from '@components/forms/WeightInput';
import { RelationControl } from '@modules/categories/components/Conditions/RelationControl';
import { UiFilter } from '@src/entity/UiFilter';
import { Input, Select } from 'antd';

export const FilterValueControl2 = ({
  value: valueProp,
  onChange,
  filter,
  invalid,
}: {
  value: UiFilter.IUiFilterValue;
  onChange: (value: any | any[]) => void;
  filter: UiFilter.IUiFilter | null;
  invalid?: boolean;
}) => {
  if (!valueProp || !filter) {
    return <Input disabled />;
  }

  const { operator, value, entity, type } = valueProp;

  const isMultiple = [
    UiFilter.UiFilterOperator.In,
    UiFilter.UiFilterOperator.NotIn,
  ].includes(operator);

  if (entity && type === UiFilter.UiFilterType.Relation) {
    return (
      <RelationControl
        value={value}
        variant="borderless"
        isMultiple={isMultiple}
        onChange={onChange}
        entity={entity}
        status={invalid ? 'error' : undefined}
      />
    );
  }

  if (type === UiFilter.UiFilterType.Price) {
    return (
      <CurrencyInput
        variant="borderless"
        value={(Array.isArray(value) ? value?.[0] : value) || 0}
        onChange={(value) => onChange(value !== null ? [value] : [])}
        status={invalid ? 'error' : undefined}
      />
    );
  }

  if (type === UiFilter.UiFilterType.Weight) {
    return (
      <WeightInput
        variant="borderless"
        value={(Array.isArray(value) ? value?.[0] : value) || 0}
        onChange={(value) => onChange(value !== null ? [value] : [])}
        // status={invalid ? 'error' : undefined}
      />
    );
  }

  if (filter?.options?.length) {
    return (
      <Select
        variant="borderless"
        style={{ width: '100%' }}
        options={filter.options}
        value={value}
        mode={isMultiple ? 'multiple' : undefined}
        onChange={onChange}
        status={invalid ? 'error' : undefined}
      />
    );
  }

  return (
    <Input
      variant="borderless"
      value={(Array.isArray(value) ? value?.[0] : value) || ''}
      onChange={({ target }) =>
        onChange(target.value.trim() ? [target.value] : [])
      }
      status={invalid ? 'error' : undefined}
    />
  );
};
