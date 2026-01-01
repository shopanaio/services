import { InsertHorizontalRuleButton } from '@components/editor/Remirror/InsertHorizontalRuleButton';
import { LinkDropdown } from '@components/editor/Remirror/LinkDropdown';
import { Space } from 'antd';

export const LinkGroup = () => {
  return (
    <Space.Compact>
      <InsertHorizontalRuleButton />
      <LinkDropdown />
    </Space.Compact>
  );
};
