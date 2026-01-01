import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useProjectProcessing } from '@modules/projects/hooks/useProjectProcessing';
import { Progress, Typography } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

import cartImg from '@assets/shop-cart.png';

export interface IFinishStepProps {
  onNext: () => void;
  ready?: boolean;
}

export const FinishStep = ({ onNext, ready }: IFinishStepProps) => {
  const { formatMessage } = useIntl();
  const progress = useProjectProcessing(!!ready);

  useEffect(() => {
    if (progress === 100) {
      setTimeout(onNext, 1000);
    }
  }, [progress, onNext]);

  return (
    <>
      <Flex
        direction="column"
        align="center"
        grow="1"
        pt="10"
        data-testid="finish-step-container"
      >
        <Box
          css={css`
            text-align: center;
          `}
        >
          <Typography.Title level={4} data-testid="step-title">
            {formatMessage(
              { id: t('projects.finish.title') },
              { progress: Math.round(progress) },
            )}
          </Typography.Title>
          <Typography.Text
            css={css`
              color: var(--color-gray-8);
            `}
          >
            {formatMessage({ id: t('projects.finish.subtitle') })}
          </Typography.Text>
        </Box>
        <Box mt="10">
          <Progress
            format={() => (
              <Box
                css={css`
                  margin-left: 21px;
                  margin-top: 5px;
                  border-radius: 100%;
                  overflow: hidden;
                  width: 160px;
                `}
              >
                <img
                  src={cartImg}
                  alt=""
                  width="100"
                  height="100"
                  css={css`
                    width: 100%;
                    height: 100%;
                  `}
                />
              </Box>
            )}
            size={202}
            type="circle"
            percent={progress}
            strokeLinecap="butt"
            strokeWidth={5}
            strokeColor={{
              '0%': 'var(--color-blue-6)',
              '50%': 'var(--color-magenta-6)',
              '100%': 'var(--color-blue-6)',
            }}
          />
        </Box>
      </Flex>
    </>
  );
};
