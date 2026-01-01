import { Flex } from '@components/utility/Flex';
import { Button } from 'antd';
import { remirrorStateUtil } from '@components/editor/Remirror/utils';
import { EditorState } from 'remirror';
import { IDescriptionFields } from '@src/entity/Content/description';

export interface ISaveButtonGroupProps {
  state: EditorState | null;
  onSave: (fields: IDescriptionFields | null) => void;
  onCancel: () => void;
}

export const SaveButtonGroup = ({
  onCancel,
  onSave,
  state,
}: ISaveButtonGroupProps) => {
  const handleSave = () => {
    const fields = getApiRemirrorJSON(state);
    if (!fields) {
      onSave(null);
      return;
    }

    onSave(fields);
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Flex gap="3">
      <Button
        type="primary"
        onClick={handleSave}
        data-testid="save-richtext-button"
      >
        Save
      </Button>
      <Button onClick={handleCancel} data-testid="cancel-richtext-button">
        Cancel
      </Button>
    </Flex>
  );
};

const getApiRemirrorJSON = (value: EditorState | null) => {
  if (!value) {
    return null;
  }

  return {
    json: remirrorStateUtil.getJSON(value),
    html: remirrorStateUtil.getHTML(value),
    text: remirrorStateUtil.getText(value),
  };
};
