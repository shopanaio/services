/* eslint-disable jsx-a11y/no-autofocus */
import { css } from '@emotion/react';
import { Controller } from 'react-hook-form';
import { Suspense } from 'react';
import { Modal } from 'antd';
import { RichTextEditor } from '@components/editor/Remirror';

const s = {
  container: css`
    padding: var(--x2);
    height: calc(100vh - 200px);
    box-sizing: border-box;
  `,
};

interface IDescriptionFieldModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  name: string;
  onOk: () => void;
  placeholder?: string;
}

export const DescriptionFieldModal = ({
  title,
  open,
  onCancel,
  name,
  onOk,
  placeholder,
}: IDescriptionFieldModalProps) => {
  return (
    <Modal
      title={title}
      open={open}
      width="100%"
      centered
      onCancel={onCancel}
      afterOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      onOk={onOk}
    >
      <div css={s.container}>
        <Controller
          key={name}
          name={name}
          render={({ field }) => (
            <Suspense fallback={null}>
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                placeholder={placeholder}
                autoFocus
              />
            </Suspense>
          )}
        />
      </div>
    </Modal>
  );
};
