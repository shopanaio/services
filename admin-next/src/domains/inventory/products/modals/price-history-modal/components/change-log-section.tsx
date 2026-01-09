import { Paper } from "../../../components/paper";
import { PaperHeader } from "../../../components/paper-header";
import { PriceTimeline } from "../../../components/pricing/components";
import type { IPriceHistoryRecord } from "../types";
import { useStyles } from "../price-history-modal.styles";

interface IChangeLogSectionProps {
  history: IPriceHistoryRecord[];
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
