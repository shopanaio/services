import { ProcessingIndicator } from '@components/processing/Processing';
import { $appProcessing } from '@modules/app/store/processing';
import { api } from '@pixli/api';
import { useSelector } from '@reframework/qx';
import { useEffect } from 'react';

export const Processing = () => {
  const isProcessing = useSelector($appProcessing.isProcessing);

  useEffect(() => {
    api.onProcessing($appProcessing.setProcessing);
  }, []);

  return <ProcessingIndicator active={isProcessing} />;
};
