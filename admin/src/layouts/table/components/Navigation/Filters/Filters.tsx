import { Flex } from '@components/utility/Flex';
import { UiFilter } from '@src/entity/UiFilter';
import { AddFilterButton } from '@src/layouts/table/components/Navigation/Filters/AddFilterButton';
import { Button } from 'antd';
import { MdClose } from 'react-icons/md';

export interface IFiltersProps {
  options: UiFilter.IUiFilter[];
  value: UiFilter.IUiFilterValue[];
  onChange: (value: UiFilter.IUiFilterValue[]) => void;
}

interface IProps extends IFiltersProps {
  cancelButton?: React.ReactNode;
}

export const Filters = ({
  options = [],
  value = [],
  onChange: onChangeProp,
  cancelButton,
  ...props
}: IProps) => {
  return (
    <Flex mt="2" justify="space-between" wrap="nowrap">
      <Flex gap="2" wrap="wrap">
        {value.map((it) => (
          <Button size="small" onClick={() => {}} icon={<MdClose />}>
            <Flex align="center" justify="space-between">
              {it.label}
            </Flex>
          </Button>
        ))}
        <Flex gap="2" wrap="nowrap">
          <AddFilterButton
            options={options}
            value={value}
            onChange={onChangeProp}
            {...props}
          />
          <Button size="small" type="link" onClick={() => onChangeProp([])}>
            Clear all
          </Button>
        </Flex>
      </Flex>
      <Flex shrink="0">{cancelButton}</Flex>
    </Flex>
  );
};
