import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiVariantPriceConnection } from "@/graphql/types";
import { PriceTimeline } from "../../../components/pricing/components/price-timeline";
import { useStyles } from "../price-history-modal.styles";

interface IChangeLogSectionProps {
  history: ApiVariantPriceConnection;
}

export const ChangeLogSection = ({ history }: IChangeLogSectionProps) => {
  const { styles } = useStyles();

  return (
    <Paper className={styles.changeLogPaper}>
      <PaperHeader title="Price Changes" />
      <div
        className={styles.timelineContainer}
        data-testid="price-history-change-log"
      >
        <PriceTimeline history={history} dataTestId="price-history-timeline" />
      </div>
    </Paper>
  );
};
