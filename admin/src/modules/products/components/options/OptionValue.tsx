import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { MediaFileControl } from '@components/media/control/MediaFileControl';
import { Button, ColorPicker, Input, Typography } from 'antd';
import {
  MdClose,
  MdColorLens,
  MdInvertColors,
  MdImage,
  MdDragIndicator,
} from 'react-icons/md';
import { DropdownSuffix } from '@components/forms/DropdownSuffix';
import { FeatureStyleType, FeatureSwatchType } from '@src/graphql';
import { syntheticId } from '@src/utils/synthetic-id';
import { optionStyles } from './styles';
import { IProductFeature } from '@src/entity/Product/ProductFeature';
import { ISwatch } from '@src/entity/Feature/Swatch';
import { useEffect, useMemo, useCallback } from 'react';
import { css } from '@emotion/react';

// Константы
const SWATCH_SIZE = 24;
const LABEL_FONT_SIZE = 12;
const DEFAULT_OPACITY = 0.7;

const valueStyles = [
  {
    key: FeatureSwatchType.Color,
    label: 'Swatch Color',
    icon: <MdColorLens />,
  },
  {
    key: FeatureSwatchType.ColorDuo,
    label: 'Two-tone Color',
    icon: <MdInvertColors />,
  },
  {
    key: FeatureSwatchType.Image,
    label: 'Swatch Image',
    icon: <MdImage />,
  },
];

interface IOptionValueProps {
  value: IProductFeature;
  onChange: (value: IProductFeature) => void;
  onDelete: () => void;
  groupStyle: FeatureStyleType;
  placeholder?: string;
}

const emptySwatch = (): ISwatch => {
  return {
    id: syntheticId(),
    type: FeatureSwatchType.Color,
    color1: '',
    color2: '',
    image: null,
  };
};

// Мемоизированная константа для пустого swatch
const EMPTY_SWATCH = emptySwatch();

export const OptionValue = ({
  value,
  onChange,
  onDelete,
  groupStyle,
  placeholder,
}: IOptionValueProps) => {
  const { swatch, style } = value;

  // Оптимизированный useEffect - убираем лишние зависимости
  useEffect(() => {
    if (groupStyle !== style) {
      onChange({
        ...value,
        style: groupStyle,
        ...(groupStyle === FeatureStyleType.Swatch && {
          swatch: {
            ...(swatch || EMPTY_SWATCH),
            type: swatch?.type || FeatureSwatchType.Color,
          },
        }),
      });
    }
  }, [groupStyle, style, onChange, value, swatch]);

  // Мемоизированный колбэк для изменения swatch
  const onChangeSwatch = useCallback(
    (next: Partial<ISwatch>) => {
      onChange({
        ...value,
        swatch: {
          ...(swatch || EMPTY_SWATCH),
          ...next,
        },
      });
    },
    [value, swatch, onChange],
  );

  // Мемоизированный колбэк для изменения типа swatch
  const handleSwatchTypeChange = useCallback(
    (key: FeatureSwatchType) => {
      onChange({
        ...value,
        swatch: {
          ...(swatch || EMPTY_SWATCH),
          type: key,
        },
      });
    },
    [value, swatch, onChange],
  );

  const disabledStyleSelectorStyle = useMemo(
    () => ({
      opacity: DEFAULT_OPACITY,
      cursor: 'default' as const,
    }),
    [],
  );

  const labelStyle = useMemo(
    () => ({
      fontSize: LABEL_FONT_SIZE,
    }),
    [],
  );

  const renderSwatchControl = useMemo(() => {
    if (style !== FeatureStyleType.Swatch) {
      return null;
    }

    const { color1, color2, image, type: swatchType } = swatch || {};

    switch (swatchType) {
      case FeatureSwatchType.Color:
        return (
          <ColorPicker
            value={color1}
            onChange={(c) => onChangeSwatch({ color1: c.toHexString() })}
            size="small"
            disabledAlpha
            format="hex"
          />
        );
      case FeatureSwatchType.ColorDuo:
        return (
          <>
            <ColorPicker
              value={color1}
              onChange={(c) => onChangeSwatch({ color1: c.toHexString() })}
              size="small"
              disabledAlpha
              format="hex"
            />
            <ColorPicker
              value={color2}
              onChange={(c) => onChangeSwatch({ color2: c.toHexString() })}
              size="small"
              disabledAlpha
              format="hex"
            />
          </>
        );
      case FeatureSwatchType.Image:
        return (
          <Box w={`${SWATCH_SIZE}px`} h={`${SWATCH_SIZE}px`}>
            <MediaFileControl
              name={value.id}
              file={image}
              onChange={([file]) => onChangeSwatch({ image: file })}
              onClear={() => onChangeSwatch({ image: null })}
              size="small"
              radius="2px"
              dashed={false}
            />
          </Box>
        );
      default:
        return null;
    }
  }, [style, swatch, onChangeSwatch, value.id]);

  const renderValueStyleSelector = useMemo(() => {
    if (style !== FeatureStyleType.Swatch) {
      const { icon, label } = optionStyles.find((it) => it.key === style) || {};
      return (
        <Flex gap="1" align="center" style={disabledStyleSelectorStyle}>
          {icon}
          <Typography.Text style={labelStyle}>{label}</Typography.Text>
        </Flex>
      );
    }

    return (
      <>
        <DropdownSuffix
          items={valueStyles}
          selectedKey={swatch?.type}
          placeholder="Select style"
          onSelect={handleSwatchTypeChange}
        />
        {renderSwatchControl}
      </>
    );
  }, [
    style,
    swatch?.type,
    disabledStyleSelectorStyle,
    labelStyle,
    handleSwatchTypeChange,
    renderSwatchControl,
  ]);

  return (
    <Input
      placeholder={placeholder}
      value={value.title}
      onChange={(e) =>
        onChange({
          ...value,
          title: e.target.value,
        })
      }
      prefix={<ValuePrefix />}
      suffix={
        <Flex
          gap="2"
          align="center"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {renderValueStyleSelector}
          <Button
            size="small"
            type="text"
            icon={<MdClose />}
            onClick={onDelete}
          />
        </Flex>
      }
    />
  );
};

const ValuePrefix = ({ children = null }: { children?: React.ReactNode }) => (
  <Flex
    align="center"
    justify="center"
    gap="2"
    css={css`
      cursor: grab;
    `}
  >
    <MdDragIndicator size={16} />
    {children}
  </Flex>
);
