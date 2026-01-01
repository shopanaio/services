import { css } from '@emotion/react';
import { UploadCsvButton } from '@modules/csv/components/UploadButton';

const Csv = () => {
  return (
    <div
      css={css`
        display: flex;
        height: 100vh;
        width: 100vw;
        justify-content: center;
        align-items: center;
      `}
    >
      <UploadCsvButton />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default Csv;
