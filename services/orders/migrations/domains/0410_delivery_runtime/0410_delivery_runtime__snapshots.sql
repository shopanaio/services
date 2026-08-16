CREATE TABLE orders.delivery_fulfillment_snapshots (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  store_id uuid NOT NULL,
  order_id uuid NOT NULL,
  checkout_id uuid NOT NULL,
  delivery_group_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('CANCELLED', 'CLOSED', 'IN_PROGRESS', 'INCOMPLETE', 'ON_HOLD', 'OPEN', 'SCHEDULED')),
  request_status text NOT NULL CHECK (request_status IN ('ACCEPTED', 'CANCELLATION_ACCEPTED', 'CANCELLATION_REJECTED', 'CANCELLATION_REQUESTED', 'CLOSED', 'REJECTED', 'SUBMITTED', 'UNSUBMITTED')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT delivery_fulfillment_snapshots_group_key UNIQUE (store_id, order_id, delivery_group_id)
);

CREATE INDEX delivery_fulfillment_snapshots_order_idx
  ON orders.delivery_fulfillment_snapshots (store_id, order_id);
CREATE INDEX delivery_fulfillment_snapshots_status_idx
  ON orders.delivery_fulfillment_snapshots (store_id, status, updated_at);

CREATE TABLE orders.delivery_fulfillment_updates (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  fulfillment_order_id uuid NOT NULL,
  shipment_id uuid NOT NULL,
  shipment_revision integer NOT NULL CHECK (shipment_revision > 0),
  state text NOT NULL CHECK (state IN ('SHIPMENT_CREATED', 'IN_TRANSIT', 'DELIVERED', 'DELIVERY_FAILED', 'CANCELLED')),
  request_hash text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_fulfillment_updates_shipment_revision_key UNIQUE (store_id, shipment_id, shipment_revision)
);

CREATE INDEX delivery_fulfillment_updates_fulfillment_idx
  ON orders.delivery_fulfillment_updates (store_id, fulfillment_order_id, created_at);
