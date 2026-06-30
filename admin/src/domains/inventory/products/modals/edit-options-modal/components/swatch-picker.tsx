import { useState } from "react";
import {
  Button,
  Typography,
  Flex,
  ColorPicker,
  Popover,
  Segmented,
  Upload,
  Tabs,
} from "antd";
import { CloseOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { SwatchType } from "@/graphql/types";
import { useStyles } from "../edit-options-modal.styles";
import { SWATCH_MODE_OPTIONS, type SwatchModeType } from "../edit-options-modal.constants";
import type { OptionEditorSwatch } from "../types";

interface ISwatchPickerProps {
  swatch: OptionEditorSwatch | null;
  onChange: (swatch: OptionEditorSwatch) => void;
}

export const SwatchPicker = ({ swatch, onChange }: ISwatchPickerProps) => {
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState<"1" | "2">("1");

  if (!swatch) return null;

  const { swatchType, colorOne, colorTwo } = swatch;
  const fileId = swatch.fileId;
  const fileUrl = swatch.fileUrl;

  const mode: SwatchModeType = swatchType === SwatchType.Image ? "image" : "color";
  const isDuotone = swatchType === SwatchType.Gradient;
  const swatchModeOptions = SWATCH_MODE_OPTIONS.map((option) =>
    option.value === "image" && !fileId
      ? { ...option, disabled: true }
      : option,
  );

  const handleModeChange = (nextMode: SwatchModeType) => {
    if (nextMode === "color") {
      if (isDuotone) {
        onChange({
          swatchType: SwatchType.Gradient,
          colorOne: colorOne || "#1677ff",
          colorTwo: colorTwo || "#333333",
        });
      } else {
        onChange({ swatchType: SwatchType.Color, colorOne: colorOne || "#1677ff" });
      }
    } else {
      onChange({
        swatchType: SwatchType.Image,
        fileId: fileId ?? null,
        fileUrl: fileUrl ?? null,
      });
    }
  };

  const handleAddSecondColor = () => {
    onChange({
      swatchType: SwatchType.Gradient,
      colorOne: colorOne || "#1677ff",
      colorTwo: "#333333",
    });
    setActiveColorTab("2");
  };

  const handleRemoveSecondColor = () => {
    onChange({ swatchType: SwatchType.Color, colorOne: colorOne || "#1677ff" });
    setActiveColorTab("1");
  };

  const handleColorChange = (colorKey: "colorOne" | "colorTwo", value: string) => {
    onChange({ swatchType, colorOne, colorTwo, [colorKey]: value });
  };

  const handleImageRemove = () => {
    onChange({ swatchType: SwatchType.Color, colorOne: "#1677ff" });
  };

  const renderTrigger = () => {
    if (swatchType === SwatchType.Color) {
      return (
        <div className={styles.swatchTrigger}>
          <div className={styles.swatchColor} style={{ background: colorOne ?? undefined }} />
        </div>
      );
    }
    if (swatchType === SwatchType.Gradient) {
      return (
        <div className={styles.swatchTrigger}>
          <div
            className={styles.swatchColor}
            style={{
              background: `linear-gradient(90deg, ${colorOne} 49.9%, ${colorTwo} 50%, ${colorTwo} 100%)`,
            }}
          />
        </div>
      );
    }
    return (
      <div className={styles.swatchTrigger}>
        {fileUrl ? (
          <img src={fileUrl} alt="" className={styles.swatchImage} />
        ) : (
          <div className={styles.swatchImagePlaceholder}>
            <PictureOutlined />
          </div>
        )}
      </div>
    );
  };

  const renderColorContent = () => {
    const currentColor = activeColorTab === "1" ? colorOne : colorTwo;
    const colorKey = activeColorTab === "1" ? "colorOne" : "colorTwo";

    const tabItems = [
      {
        key: "1",
        label: "Color 1",
        closable: false,
      },
      ...(isDuotone
        ? [
            {
              key: "2",
              label: "Color 2",
              closable: true,
            },
          ]
        : []),
    ];

    return (
      <>
        <Tabs
          type="editable-card"
          activeKey={activeColorTab}
          onChange={(key) => setActiveColorTab(key as "1" | "2")}
          onEdit={(targetKey, action) => {
            if (action === "add") {
              handleAddSecondColor();
            } else if (action === "remove" && targetKey === "2") {
              handleRemoveSecondColor();
            }
          }}
          items={tabItems}
          size="small"
          className={styles.swatchColorTabs}
          hideAdd={isDuotone}
          styles={{
            header: {
              margin: 0,
            },
          }}
        />
        <ColorPicker
          arrow={false}
          mode="single"
          value={currentColor}
          defaultFormat="hex"
          disabledFormat
          onChange={(c) => handleColorChange(colorKey, c.toHexString())}
          getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          disabledAlpha
          styles={{
            popup: {
              root: {
                position: "static",
                marginTop: -12,
              },
            },
            popupOverlayInner: {
              boxShadow: "none",
              padding: 0,
            },
          }}
          format="hex"
          open
        >
          <div />
        </ColorPicker>
      </>
    );
  };

  const renderImageContent = () => {
    if (fileUrl) {
      return (
        <div className={styles.swatchImagePreview}>
          <img src={fileUrl} alt="" className={styles.swatchImagePreviewImg} />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            className={styles.swatchImageRemove}
            onClick={handleImageRemove}
          />
        </div>
      );
    }

    return (
      <div className={styles.swatchDropZone}>
        <Upload.Dragger
          accept="image/*"
          disabled
          showUploadList={false}
          beforeUpload={(file) => {
            void file;
            return false;
          }}
        >
          <Flex align="center" justify="center" vertical>
            <UploadOutlined className={styles.swatchDraggerIcon} />
            <Typography.Text
              strong
              type="secondary"
              className={styles.swatchDraggerTitle}
            >
              Image upload unavailable
            </Typography.Text>
          </Flex>
        </Upload.Dragger>
      </div>
    );
  };

  const popoverContent = (
    <div className={styles.swatchPopoverContent}>
      <Segmented
        block
        size="small"
        options={swatchModeOptions}
        value={mode}
        onChange={(val) => handleModeChange(val as SwatchModeType)}
      />
      {mode === "color" ? renderColorContent() : renderImageContent()}
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
    >
      <span data-testid="edit-options-swatch-trigger">
        {renderTrigger()}
      </span>
    </Popover>
  );
};
