import { useEffect, useState } from 'react';
import { syntheticId } from '@src/utils/synthetic-id';
import { IDescriptionFields } from '@src/entity/Content/description';
import Remirror, { RichTextEditorProps } from './Remirror';

export const ControlledRemirror = ({
  onChange,
  initialContent,
  onSaveDone,
  ...props
}: Omit<
  RichTextEditorProps,
  'onSave' | 'onCancel' | 'editable' | 'initialContent'
> & {
  initialContent: IDescriptionFields | null;
  onChange: (values: IDescriptionFields | null) => void;
  /**
   * Optional callback fired after user presses Save in the editor.
   * Useful to trigger side effects like persisting and refetching.
   */
  onSaveDone?: (values: IDescriptionFields | null) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [key, setKey] = useState(syntheticId());
  const { json } = initialContent || {};

  useEffect(() => {
    setKey(syntheticId());
  }, [initialContent]);

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const onSave = (fields: IDescriptionFields | null) => {
    onChange(fields);
    onSaveDone?.(fields);
    setIsEditing(false);
  };

  const onCancel = () => {
    setKey(syntheticId());
    setIsEditing(false);
  };

  return (
    <Remirror
      key={key}
      {...props}
      initialContent={json || null}
      onClick={handleClick}
      editable={isEditing}
      onCancel={onCancel}
      onSave={onSave}
      {...(isEditing ? { height: '100%' } : {})}
    />
  );
};
