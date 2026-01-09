import { Paper } from "../../../components/Paper";
import { PaperHeader } from "../../../components/PaperHeader";
import { PriceTimeline } from "../../../components/pricing/components";
import type { IPriceHistoryRecord } from "../types";
import { useStyles } from "../PriceHistoryModal.styles";

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
