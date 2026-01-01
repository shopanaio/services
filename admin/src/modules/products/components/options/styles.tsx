import {
  MdColorLens,
  MdOutlineImage,
  MdOutlineRadioButtonChecked,
  MdMenu,
  MdCompareArrows,
} from 'react-icons/md';
import { FeatureStyleType } from '@src/graphql';

export const optionStyles = [
  {
    label: 'Swatch',
    key: FeatureStyleType.Swatch,
    icon: <MdColorLens />,
  },
  {
    label: 'Cover',
    key: FeatureStyleType.VariantCover,
    icon: <MdOutlineImage />,
  },
  {
    label: 'Radio',
    key: FeatureStyleType.Radio,
    icon: <MdOutlineRadioButtonChecked />,
  },
  {
    label: 'Dropdown',
    key: FeatureStyleType.Dropdown,
    icon: <MdMenu />,
  },
  {
    label: 'Size',
    key: FeatureStyleType.ApparelSize,
    icon: <MdCompareArrows />,
  },
];
