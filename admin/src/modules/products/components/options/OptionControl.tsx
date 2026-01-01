import { Input } from 'antd';
import { useCallback } from 'react';
import { DropdownSuffix } from '@components/forms/DropdownSuffix';
import { IProductFeatureGroup } from '@src/entity/Product/ProductFeature';
import { FeatureStyleType } from '@src/graphql';
import { optionStyles } from './styles';

interface IOptionControlProps {
  option: IProductFeatureGroup;
  setOption: (option: IProductFeatureGroup) => void;
  placeholder?: string;
}

interface IStyleSelectorProps {
  style: FeatureStyleType | undefined;
  onStyleChange: (style: FeatureStyleType) => void;
}

const StyleSelector = ({ style, onStyleChange }: IStyleSelectorProps) => (
  <DropdownSuffix
    items={optionStyles}
    selectedKey={style}
    placeholder="Select style"
    stopPropagation
    onSelect={(key) => {
      onStyleChange(key as FeatureStyleType);
    }}
  />
);

export const OptionControl = ({
  option,
  setOption,
  placeholder,
}: IOptionControlProps) => {
  const handleStyleChange = useCallback(
    (style: FeatureStyleType) => {
      setOption({ ...option, style });
    },
    [option, setOption],
  );

  const handleTitleChange = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setOption({
        ...option,
        title: value,
      });
    },
    [option, setOption],
  );

  return (
    <Input
      placeholder={placeholder}
      value={option.title}
      onChange={handleTitleChange}
      data-testid="feature-title-input"
      suffix={
        <StyleSelector style={option.style} onStyleChange={handleStyleChange} />
      }
    />
  );
};
