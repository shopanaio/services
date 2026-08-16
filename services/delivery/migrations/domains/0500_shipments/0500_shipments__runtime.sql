CREATE TABLE delivery.shipments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  store_id uuid NOT NULL,
  order_id uuid NOT NULL,
  fulfillment_order_id uuid NOT NULL,
  provider_account_id uuid NOT NULL,
  provider_shipment_reference text,
  state text NOT NULL CHECK (state IN ('CREATED','SUBMITTING','PENDING','ACCEPTED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','DELIVERY_FAILED','RETURNING','RETURNED','CANCELLING','CANCELLED','FAILED')),
  revision integer NOT NULL CHECK (revision > 0),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipments_provider_reference_key UNIQUE (store_id, provider_account_id, provider_shipment_reference)
);
CREATE INDEX shipments_store_order_idx ON delivery.shipments (store_id, order_id);
CREATE INDEX shipments_fulfillment_idx ON delivery.shipments (store_id, fulfillment_order_id);

CREATE TABLE delivery.shipment_operations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  shipment_id uuid NOT NULL REFERENCES delivery.shipments(id),
  type text NOT NULL CHECK (type IN ('CREATE','CANCEL','GET','RECONCILE')),
  state text NOT NULL CHECK (state IN ('REQUESTED','PROCESSING','PENDING','SUCCEEDED','FAILED')),
  idempotency_scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_operations_idempotency_key UNIQUE (store_id, idempotency_scope, idempotency_key)
);
CREATE INDEX shipment_operations_shipment_idx ON delivery.shipment_operations (store_id, shipment_id, created_at);

CREATE TABLE delivery.shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  shipment_id uuid NOT NULL REFERENCES delivery.shipments(id),
  provider_event_id text NOT NULL,
  snapshot jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_tracking_events_provider_key UNIQUE (store_id, shipment_id, provider_event_id)
);
CREATE INDEX shipment_tracking_events_timeline_idx ON delivery.shipment_tracking_events (store_id, shipment_id, occurred_at);

CREATE TABLE delivery.provider_inbox (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  provider_account_id uuid NOT NULL,
  provider_event_id text NOT NULL,
  event_hash text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_inbox_event_key UNIQUE (store_id, provider_account_id, provider_event_id)
);

CREATE TABLE delivery.shipment_mutations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  store_id uuid NOT NULL,
  shipment_id uuid NOT NULL REFERENCES delivery.shipments(id),
  idempotency_scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  shipment_revision integer NOT NULL CHECK (shipment_revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_mutations_idempotency_key UNIQUE (store_id, idempotency_scope, idempotency_key)
);

CREATE TABLE delivery.shipment_outbox (
  id uuid PRIMARY KEY,
  store_id uuid NOT NULL,
  shipment_id uuid NOT NULL REFERENCES delivery.shipments(id),
  event_type text NOT NULL,
  event jsonb NOT NULL,
  emitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipment_outbox_pending_idx ON delivery.shipment_outbox (emitted_at, created_at);
