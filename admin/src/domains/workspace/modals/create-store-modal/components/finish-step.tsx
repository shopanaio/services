"use client";

import { useEffect } from "react";
import { Typography, Progress } from "antd";
import { useStyles } from "../create-store-modal.styles";
import { useStoreProcessing } from "../hooks";
import cartImg from "@/assets/shop-cart.png";

interface FinishStepProps {
  ready: boolean;
  onComplete: () => void;
}

export function FinishStep({ ready, onComplete }: FinishStepProps) {
  const { styles } = useStyles();
  const progress = useStoreProcessing(ready);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onComplete, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  return (
    <div className={styles.finishContainer}>
      <Typography.Title level={4} className={styles.finishTitle}>
        Creating your store... {Math.round(progress)}%
      </Typography.Title>
      <Typography.Text className={styles.finishSubtitle}>
        Please wait while we set up your store
      </Typography.Text>
      <div className={styles.progressContainer}>
        <Progress
          format={() => (
            <div className={styles.progressImageContainer}>
              <img
                src={cartImg.src}
                alt=""
                width={100}
                height={100}
                className={styles.progressImage}
              />
            </div>
          )}
          type="circle"
          percent={progress}
          size={202}
          strokeWidth={5}
          strokeLinecap="butt"
          strokeColor={{
            "0%": "#1890ff",
            "50%": "#722ed1",
            "100%": "#1890ff",
          }}
        />
      </div>
    </div>
  );
}
