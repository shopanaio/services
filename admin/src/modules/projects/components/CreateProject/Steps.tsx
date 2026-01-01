import { MdOutlineTranslate } from 'react-icons/md';
import { AiOutlineRocket } from 'react-icons/ai';
import { css } from '@emotion/react';
import { Steps as AntSteps } from 'antd';
import { ShopIcon } from '@src/layouts/app/components/StoreMenu/shop-icon/ShopIcon';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export enum CreateProjectSteps {
  Information,
  Localization,
  Finish,
}

interface IStepsProps {
  current: CreateProjectSteps;
}

const steps = (formatMessage: ReturnType<typeof useIntl>['formatMessage']) => [
  {
    title: formatMessage({ id: t('projects.steps.information') }),
    icon: ShopIcon,
    'data-testid': 'information-step',
  },
  {
    title: formatMessage({ id: t('projects.steps.localization') }),
    icon: MdOutlineTranslate,
    'data-testid': 'localization-step',
  },
  {
    title: formatMessage({ id: t('projects.steps.finish') }),
    icon: AiOutlineRocket,
    'data-testid': 'finish-step',
  },
];

export const Steps = ({ current }: IStepsProps) => {
  const { formatMessage } = useIntl();
  return (
    <AntSteps
      current={current}
      items={steps(formatMessage).map(({ icon: Icon, ...step }, idx) => ({
        ...step,
        'data-active': current === idx,
        icon: (
          <Icon
            size={24}
            css={css`
              margin-top: var(--x1);
            `}
          />
        ),
      }))}
    />
  );
};
