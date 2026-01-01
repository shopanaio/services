import { Quill } from 'react-quill';

const Parchment = Quill.import('parchment');

/** Weight */
const FontWeight = new Parchment.Attributor.Class('weight', 'font-weight', {
  scope: Parchment.Scope.INLINE,
  whitelist: ['regular', 'medium', 'semibold', 'bold', false],
});

Quill.register(
  {
    'attributors/class/weight': FontWeight,
    'formats/weight': FontWeight,
  },
  true,
);

/** Size */
const Size = Quill.import('attributors/class/size');
Size.keyName = 'font-size';
Size.whitelist = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', false];
Quill.register(Size, true);
