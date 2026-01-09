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
import { useStyles } from "../edit-options-modal.styles";
import { SWATCH_MODE_OPTIONS, type SwatchModeType } from "../edit-options-modal.constants";
import type { ISwatch } from "../edit-options-modal.schema";

interface ISwatchPickerProps {
  swatch: ISwatch;
  onChange: (swatch: ISwatch) => void;
}

export const SwatchPicker = ({ swatch, onChange }: ISwatchPickerProps) => {
  const { styles } = useStyles();
  const [open, setOpen] = useState(false);
  const [activeColorTab, setActiveColorTab] = useState<"1" | "2">("1");
  const { type, color1, color2, imageUrl } = swatch;

  const mode: SwatchModeType = type === "image" ? "image" : "color";
  const isDuotone = type === "color_duo";

  const handleModeChange = (nextMode: SwatchModeType) => {
    if (nextMode === "color") {
      if (isDuotone) {
        onChange({
          type: "color_duo",
          color1: color1 || "#1677ff",
          color2: color2 || "#333333",
        });
      } else {
        onChange({ type: "color", color1: color1 || "#1677ff" });
      }
    } else {
      onChange({ type: "image", imageUrl: imageUrl || "" });
    }
  };

  const handleAddSecondColor = () => {
    onChange({
      type: "color_duo",
      color1: color1 || "#1677ff",
      color2: "#333333",
    });
    setActiveColorTab("2");
  };

  const handleRemoveSecondColor = () => {
    onChange({ type: "color", color1: color1 || "#1677ff" });
    setActiveColorTab("1");
  };

  const handleColorChange = (colorKey: "color1" | "color2", value: string) => {
    onChange({ ...swatch, [colorKey]: value });
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange({ type: "image", imageUrl: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    onChange({ type: "image", imageUrl: "" });
  };

  const renderTrigger = () => {
    if (type === "color") {
      return (
        <div className={styles.swatchTrigger}>
          <div className={styles.swatchColor} style={{ background: color1 }} />
        </div>
      );
    }
    if (type === "color_duo") {
      return (
        <div className={styles.swatchTrigger}>
          <div
            className={styles.swatchColor}
            style={{
              background: `linear-gradient(90deg, ${color1} 49.9%, ${color2} 50%, ${color2} 100%)`,
            }}
          />
        </div>
      );
    }
    return (
      <div className={styles.swatchTrigger}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className={styles.swatchImage} />
        ) : (
          <div className={styles.swatchImagePlaceholder}>
            <PictureOutlined />
          </div>
        )}
      </div>
    );
  };

  const renderColorContent = () => {
    const currentColor = activeColorTab === "1" ? color1 : color2;
    const colorKey = activeColorTab === "1" ? "color1" : "color2";

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
    if (imageUrl) {
      return (
        <div className={styles.swatchImagePreview}>
          <img src={imageUrl} alt="" className={styles.swatchImagePreviewImg} />
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
          showUploadList={false}
          beforeUpload={(file) => {
            handleImageUpload(file);
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
              Upload image
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
        options={SWATCH_MODE_OPTIONS}
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
      {renderTrigger()}
    </Popover>
  );
};
