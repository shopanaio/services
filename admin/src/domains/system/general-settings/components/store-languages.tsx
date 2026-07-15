import {
  MoreOutlined,
  PlusOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import type { ApiLocale, LocaleCode } from "@/graphql/types";
import { Dropdown, Flex, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  useAddLanguageModal,
  useLocaleActionModal,
} from "../modals";

const useStyles = createStyles(({ token }) => ({
  icon: {
    color: token.colorText,
    display: "flex",
    fontSize: 20,
  },
  label: {
    color: token.colorTextSecondary,
  },
  tag: {
    cursor: "pointer",
  },
}));

interface StoreLanguagesProps {
  defaultLocale: LocaleCode;
  locales: ApiLocale[];
  onSaved: () => Promise<unknown>;
}

export const StoreLanguages = ({
  defaultLocale,
  locales,
  onSaved,
}: StoreLanguagesProps) => {
  const { styles } = useStyles();
  const addLanguageModal = useAddLanguageModal();
  const localeActionModal = useLocaleActionModal();
  const primaryLocale = locales.find((locale) => locale.code === defaultLocale);
  const secondaryLocales = locales.filter(
    (locale) => locale.code !== defaultLocale,
  );

  if (!primaryLocale) return null;

  return (
    <Paper data-testid="languages-settings-section">
      <PaperHeader title="Languages" />
      <Flex align="center" gap={16}>
        <span className={styles.icon}>
          <TranslationOutlined />
        </span>
        <div>
          <Typography.Text className={styles.label}>
            Store languages
          </Typography.Text>
          <Flex gap={4} wrap="wrap" style={{ marginTop: 4 }}>
            <Tag
              color="blue-inverse"
              data-testid={`language-item-default-${primaryLocale.code}`}
            >
              {primaryLocale.name}
            </Tag>
            {secondaryLocales.map((locale) => (
              <Dropdown
                key={locale.code}
                menu={{
                  items: [
                    {
                      key: "set-as-default",
                      label: "Set as default",
                      onClick: () =>
                        localeActionModal.push({
                          action: "set-default",
                          localeCode: locale.code,
                          localeName: locale.name,
                          onSaved,
                        }),
                    },
                    {
                      key: "delete",
                      danger: true,
                      label: "Delete language",
                      onClick: () =>
                        localeActionModal.push({
                          action: "delete",
                          localeCode: locale.code,
                          localeName: locale.name,
                          onSaved,
                        }),
                    },
                  ],
                }}
                trigger={["click"]}
              >
                <Tag
                  className={styles.tag}
                  color="blue"
                  data-testid={`language-item-${locale.code}`}
                >
                  <Flex align="center" gap={4}>
                    {locale.name}
                    <MoreOutlined />
                  </Flex>
                </Tag>
              </Dropdown>
            ))}
            <Tag
              className={styles.tag}
              data-testid="add-language-button"
              onClick={() => addLanguageModal.push({ onSaved })}
            >
              <Flex align="center" gap={4}>
                <PlusOutlined />
                Add language
              </Flex>
            </Tag>
          </Flex>
        </div>
      </Flex>
    </Paper>
  );
};
