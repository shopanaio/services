import { Paper, PaperHeader } from "@/ui-kit/paper";
import { PriceTimeline } from "../../../components/pricing/components";
import type { ApiVariantPriceConnection } from "../../../components/pricing/types";
import { useStyles } from "../price-history-modal.styles";

interface IChangeLogSectionProps {
  history: ApiVariantPriceConnection;
}

export const ChangeLogSection = ({ history }: IChangeLogSectionProps) => {
  const { styles } = useStyles();

  return (
    <Paper className={styles.changeLogPaper}>
      <PaperHeader title="Price Changes" />
      <div className={styles.timelineContainer}>
        <PriceTimeline history={history} />
      </div>
    </Paper>
  );
};
