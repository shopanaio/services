export const FULFILLMENT_STAGE_FIELDS = `
  fragment FulfillmentStageFields on FulfillmentStage {
    id version title handle sortIndex createdAt updatedAt
  }
`;

export const FULFILLMENT_TICKET_FIELDS = `
  fragment FulfillmentTicketFields on FulfillmentTicket {
    id version stageId sortIndex createdAt updatedAt
  }
`;
